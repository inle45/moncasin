import type { SupabaseClient } from "@supabase/supabase-js";
import { createFallbackCrashState } from "@/utils/crash/default-state";
import { parseIsoMs } from "@/utils/crash/datetime";
import { parseCrashState } from "@/utils/crash/parse-state";
import { serverStateNeedsAdvance } from "@/utils/crash/visual-state";
import type { CrashBetRow, CrashPublicState } from "@/utils/crash/types";
import type { Database } from "@/utils/supabase/database.types";
import { createCrashLoopClient } from "@/utils/supabase/crash-server";

export const CRASH_LOOP_MAX_STEPS = 16;
const CRASH_DISPLAY_MS = 3000;

export interface CrashTickStepLog {
  step: number;
  action: string;
  phaseBefore: string | null;
  phaseAfter: string | null;
  error: string | null;
  bettingEndsAt: string | null;
  serverNow: string;
}

export interface CrashSnapshot {
  state: CrashPublicState;
  history: number[];
  bets: CrashBetRow[];
  serverTime: number;
  error: string | null;
  source: "supabase" | "fallback";
  tickLog: CrashTickStepLog[];
  needsAdvance: boolean;
  serviceRoleConfigured: boolean;
}

function rowToState(row: Record<string, unknown>): CrashPublicState | null {
  return parseCrashState({
    round_id: row.round_id,
    round_number: row.round_number,
    phase: row.phase,
    betting_ends_at: row.betting_ends_at,
    flying_started_at: row.flying_started_at,
    crashed_at: row.crashed_at,
    crash_point: row.phase === "crashed" ? row.crash_point : null,
  });
}

function logStep(
  tickLog: CrashTickStepLog[],
  step: number,
  action: string,
  phaseBefore: string | null,
  phaseAfter: string | null,
  error: string | null,
  bettingEndsAt: string | null
) {
  tickLog.push({
    step,
    action,
    phaseBefore,
    phaseAfter,
    error,
    bettingEndsAt,
    serverNow: new Date().toISOString(),
  });
}

async function rpcRepair(
  supabase: SupabaseClient<Database>,
  tickLog: CrashTickStepLog[],
  step: number
): Promise<void> {
  const { error } = await supabase.rpc("crash_repair_live_state");
  if (error) {
    logStep(tickLog, step, "crash_repair_live_state", null, null, error.message, null);
  }
}

async function readStateDirect(
  supabase: SupabaseClient<Database>
): Promise<CrashPublicState | null> {
  const { data, error } = await supabase
    .from("crash_live_state")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`SELECT crash_live_state: ${error.message} (${error.code ?? "?"})`);
  }
  if (!data) return null;
  return rowToState(data as Record<string, unknown>);
}

async function rpcAdvanceTick(
  supabase: SupabaseClient<Database>
): Promise<{ state: CrashPublicState | null; rpcError: string | null }> {
  const { data, error } = await supabase.rpc("crash_advance_tick");

  if (error) {
    return {
      state: null,
      rpcError: `${error.message}${error.code ? ` [${error.code}]` : ""}${error.details ? ` — ${error.details}` : ""}`,
    };
  }

  const parsed = parseCrashState(data);
  if (!parsed) {
    return { state: null, rpcError: "crash_advance_tick: JSON état invalide" };
  }

  return { state: parsed, rpcError: null };
}

/**
 * Secours si la RPC ne mute pas la ligne (RLS, cache, ancienne fonction SQL).
 * Nécessite service_role (bypass RLS).
 */
async function directAdvanceRow(
  supabase: SupabaseClient<Database>,
  state: CrashPublicState,
  now = Date.now()
): Promise<{ ok: boolean; error: string | null }> {
  const bettingEnd = parseIsoMs(state.betting_ends_at);
  const crashedAt = parseIsoMs(state.crashed_at);
  const iso = new Date(now).toISOString();

  if (state.phase === "betting" && bettingEnd !== null && now >= bettingEnd) {
    const { data, error } = await supabase
      .from("crash_live_state")
      .update({
        phase: "flying",
        flying_started_at: iso,
        updated_at: iso,
      })
      .eq("id", 1)
      .eq("phase", "betting")
      .select("phase")
      .maybeSingle();

    if (error) return { ok: false, error: `UPDATE → flying: ${error.message}` };
    if (!data) {
      return {
        ok: false,
        error: "UPDATE → flying: 0 ligne modifiée (phase déjà changée ou bloquée)",
      };
    }
    return { ok: true, error: null };
  }

  if (state.phase === "flying") {
    const { data, error } = await supabase
      .from("crash_live_state")
      .update({
        phase: "crashed",
        crashed_at: iso,
        updated_at: iso,
      })
      .eq("id", 1)
      .eq("phase", "flying")
      .select("phase")
      .maybeSingle();

    if (error) return { ok: false, error: `UPDATE → crashed: ${error.message}` };
    if (!data) {
      return {
        ok: false,
        error: "UPDATE → crashed: 0 ligne (multiplicateur pas encore au crash_point — normal)",
      };
    }
    return { ok: true, error: null };
  }

  if (
    state.phase === "crashed" &&
    crashedAt !== null &&
    now >= crashedAt + CRASH_DISPLAY_MS
  ) {
    const { error } = await supabase.rpc("crash_advance_tick");
    if (!error) return { ok: true, error: null };
    return { ok: false, error: `RPC new round: ${error.message}` };
  }

  return { ok: false, error: "directAdvanceRow: rien à faire" };
}

export async function syncCrashLoop(
  supabase: SupabaseClient<Database>,
  maxSteps = CRASH_LOOP_MAX_STEPS
): Promise<{ state: CrashPublicState; tickLog: CrashTickStepLog[]; lastError: string | null }> {
  const tickLog: CrashTickStepLog[] = [];
  let lastError: string | null = null;
  let step = 0;

  await rpcRepair(supabase, tickLog, ++step);

  let state: CrashPublicState | null = null;

  try {
    state = await readStateDirect(supabase);
    logStep(tickLog, ++step, "read table", null, state?.phase ?? null, null, state?.betting_ends_at ?? null);
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    logStep(tickLog, ++step, "read table", null, null, lastError, null);
  }

  if (!state) {
    const { data, error } = await supabase.rpc("crash_get_state");
    if (error) {
      lastError = error.message;
      logStep(tickLog, ++step, "crash_get_state", null, null, error.message, null);
    } else {
      state = parseCrashState(data);
      logStep(
        tickLog,
        ++step,
        "crash_get_state",
        null,
        state?.phase ?? null,
        state ? null : "état RPC invalide",
        state?.betting_ends_at ?? null
      );
    }
  }

  if (!state) {
    return {
      state: createFallbackCrashState(),
      tickLog,
      lastError: lastError ?? "crash_live_state introuvable",
    };
  }

  for (let i = 0; i < maxSteps; i++) {
    if (!serverStateNeedsAdvance(state, Date.now())) break;

    const phaseBefore = state.phase;
    const { state: afterRpc, rpcError } = await rpcAdvanceTick(supabase);

    if (rpcError) {
      lastError = rpcError;
      logStep(
        tickLog,
        ++step,
        "crash_advance_tick RPC",
        phaseBefore,
        afterRpc?.phase ?? null,
        rpcError,
        state.betting_ends_at
      );
    } else if (afterRpc) {
      logStep(
        tickLog,
        ++step,
        "crash_advance_tick RPC",
        phaseBefore,
        afterRpc.phase,
        null,
        afterRpc.betting_ends_at
      );
      state = afterRpc;
    }

    let tableState: CrashPublicState | null = null;
    try {
      tableState = await readStateDirect(supabase);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (tableState) {
      const tableDiffers =
        tableState.phase !== state.phase ||
        tableState.flying_started_at !== state.flying_started_at;
      if (tableDiffers) {
        logStep(
          tickLog,
          ++step,
          "read after RPC (table ≠ json rpc)",
          state.phase,
          tableState.phase,
          null,
          tableState.betting_ends_at
        );
        state = tableState;
      }
    }

    if (!serverStateNeedsAdvance(state, Date.now())) continue;

    const direct = await directAdvanceRow(supabase, state);
    logStep(
      tickLog,
      ++step,
      "direct UPDATE fallback",
      state.phase,
      direct.ok ? "mutated" : state.phase,
      direct.error,
      state.betting_ends_at
    );

    if (direct.error && direct.error.includes("0 ligne")) {
      /* multiplicateur pas atteint en flying — pas fatal */
    } else if (direct.error) {
      lastError = direct.error;
    }

    try {
      const afterDirect = await readStateDirect(supabase);
      if (afterDirect) {
        const progressed = afterDirect.phase !== phaseBefore;
        logStep(
          tickLog,
          ++step,
          "read after direct",
          phaseBefore,
          afterDirect.phase,
          progressed ? null : "phase inchangée après direct",
          afterDirect.betting_ends_at
        );
        state = afterDirect;
        if (!progressed && serverStateNeedsAdvance(state, Date.now())) {
          lastError =
            lastError ??
            `Manche bloquée: phase=${state.phase}, betting_ends_at=${state.betting_ends_at}, now=${new Date().toISOString()}`;
          break;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (afterRpc && afterRpc.phase === phaseBefore && serverStateNeedsAdvance(state)) {
      lastError =
        lastError ??
        "crash_advance_tick n'a pas changé la phase alors que la manche est expirée";
    }
  }

  return { state, tickLog, lastError };
}

async function fetchHistory(
  supabase: SupabaseClient<Database>,
  limit = 12
): Promise<number[]> {
  const { data, error } = await supabase
    .from("crash_round_history")
    .select("crash_point")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map((r) => Number(r.crash_point));
}

async function fetchBets(
  supabase: SupabaseClient<Database>,
  roundId: string
): Promise<CrashBetRow[]> {
  const { data, error } = await supabase
    .from("crash_bets")
    .select("*")
    .eq("round_id", roundId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as CrashBetRow[];
}

export async function runCrashSnapshot(options?: {
  maxSteps?: number;
}): Promise<CrashSnapshot> {
  const serverTime = Date.now();
  const serviceRoleConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );

  const supabase = createCrashLoopClient();

  if (!supabase) {
    return {
      state: createFallbackCrashState(serverTime),
      history: [],
      bets: [],
      serverTime,
      error: "Clés Supabase manquantes (SUPABASE_SERVICE_ROLE_KEY ou ANON)",
      source: "fallback",
      tickLog: [],
      needsAdvance: false,
      serviceRoleConfigured,
    };
  }

  try {
    const { state, tickLog, lastError } = await syncCrashLoop(
      supabase,
      options?.maxSteps
    );
    const needsAdvance = serverStateNeedsAdvance(state, serverTime);
    const history = await fetchHistory(supabase);
    const bets = state.round_id ? await fetchBets(supabase, state.round_id) : [];

    const error =
      lastError ??
      (needsAdvance
        ? `Phase bloquée sur "${state.phase}" alors que la manche devrait avancer (voir tickLog)`
        : null);

    if (error) {
      console.error("[MonCasin /api/crash/loop]", error, { tickLog, needsAdvance });
    }

    return {
      state,
      history,
      bets,
      serverTime,
      error,
      source: "supabase",
      tickLog,
      needsAdvance,
      serviceRoleConfigured,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur Crash";
    console.error("[MonCasin /api/crash/loop] exception", message, err);

    return {
      state: createFallbackCrashState(serverTime),
      history: [],
      bets: [],
      serverTime,
      error: message,
      source: "fallback",
      tickLog: [],
      needsAdvance: true,
      serviceRoleConfigured,
    };
  }
}

export async function fetchCrashSnapshotServer(): Promise<CrashSnapshot> {
  return runCrashSnapshot();
}
