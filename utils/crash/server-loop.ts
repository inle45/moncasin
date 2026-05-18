import type { SupabaseClient } from "@supabase/supabase-js";
import { createFallbackCrashState } from "@/utils/crash/default-state";
import { parseCrashState } from "@/utils/crash/parse-state";
import { fetchSupabaseNowMs } from "@/utils/crash/supabase-clock";
import {
  serverStateNeedsDirectBettingFallback,
  serverStateNeedsRpcTick,
  serverStateStuck,
} from "@/utils/crash/visual-state";
import type { CrashBetRow, CrashPublicState } from "@/utils/crash/types";
import type { Database } from "@/utils/supabase/database.types";
import { createCrashLoopClient } from "@/utils/supabase/crash-server";

export const CRASH_LOOP_MAX_STEPS = 16;

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
  /** Horloge Postgres (crash_server_now). Null si RPC indisponible — ne pas inventer avec Date.now(). */
  serverTime: number | null;
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
  bettingEndsAt: string | null,
  serverNowIso: string
) {
  tickLog.push({
    step,
    action,
    phaseBefore,
    phaseAfter,
    error,
    bettingEndsAt,
    serverNow: serverNowIso,
  });
}

async function rpcRepair(
  supabase: SupabaseClient<Database>,
  tickLog: CrashTickStepLog[],
  step: number,
  serverNowIso: string
): Promise<void> {
  const { error } = await supabase.rpc("crash_repair_live_state");
  if (error) {
    logStep(
      tickLog,
      step,
      "crash_repair_live_state",
      null,
      null,
      error.message,
      null,
      serverNowIso
    );
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
 * Secours betting → flying uniquement. Pas de timestamps Node :
 * `crash_repair_live_state` pose `flying_started_at = now()` côté Postgres.
 */
async function directStartFlying(
  supabase: SupabaseClient<Database>
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from("crash_live_state")
    .update({ phase: "flying" })
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

  await supabase.rpc("crash_repair_live_state");
  return { ok: true, error: null };
}

export async function syncCrashLoop(
  supabase: SupabaseClient<Database>,
  maxSteps = CRASH_LOOP_MAX_STEPS
): Promise<{
  state: CrashPublicState;
  tickLog: CrashTickStepLog[];
  lastError: string | null;
  serverTimeMs: number | null;
}> {
  const tickLog: CrashTickStepLog[] = [];
  let lastError: string | null = null;
  let step = 0;

  let supabaseNowMs = await fetchSupabaseNowMs(supabase);
  const serverNowIso = supabaseNowMs
    ? new Date(supabaseNowMs).toISOString()
    : "postgres-now-unavailable";

  if (supabaseNowMs === null) {
    lastError =
      "RPC crash_server_now absente — exécuter supabase/crash-server-now.sql";
    logStep(tickLog, ++step, "crash_server_now", null, null, lastError, null, serverNowIso);
  } else {
    logStep(
      tickLog,
      ++step,
      "crash_server_now",
      null,
      null,
      null,
      null,
      serverNowIso
    );
  }

  await rpcRepair(supabase, tickLog, ++step, serverNowIso);

  let state: CrashPublicState | null = null;

  try {
    state = await readStateDirect(supabase);
    logStep(
      tickLog,
      ++step,
      "read table",
      null,
      state?.phase ?? null,
      null,
      state?.betting_ends_at ?? null,
      serverNowIso
    );
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    logStep(tickLog, ++step, "read table", null, null, lastError, null, serverNowIso);
  }

  if (!state) {
    const { data, error } = await supabase.rpc("crash_get_state");
    if (error) {
      lastError = error.message;
      logStep(
        tickLog,
        ++step,
        "crash_get_state",
        null,
        null,
        error.message,
        null,
        serverNowIso
      );
    } else {
      state = parseCrashState(data);
      logStep(
        tickLog,
        ++step,
        "crash_get_state",
        null,
        state?.phase ?? null,
        state ? null : "état RPC invalide",
        state?.betting_ends_at ?? null,
        serverNowIso
      );
    }
  }

  if (!state) {
    return {
      state: createFallbackCrashState(),
      tickLog,
      lastError: lastError ?? "crash_live_state introuvable",
      serverTimeMs: supabaseNowMs,
    };
  }

  if (supabaseNowMs === null) {
    return { state, tickLog, lastError, serverTimeMs: null };
  }

  for (let i = 0; i < maxSteps; i++) {
    if (!serverStateNeedsRpcTick(state, supabaseNowMs)) break;

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
        state.betting_ends_at,
        serverNowIso
      );
    } else if (afterRpc) {
      logStep(
        tickLog,
        ++step,
        "crash_advance_tick RPC",
        phaseBefore,
        afterRpc.phase,
        null,
        afterRpc.betting_ends_at,
        serverNowIso
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
          tableState.betting_ends_at,
          serverNowIso
        );
        state = tableState;
      }
    }

    if (!serverStateNeedsRpcTick(state, supabaseNowMs)) continue;

    if (!serverStateNeedsDirectBettingFallback(state, supabaseNowMs)) continue;

    const direct = await directStartFlying(supabase);
    logStep(
      tickLog,
      ++step,
      "direct UPDATE betting→flying",
      state.phase,
      direct.ok ? "flying" : state.phase,
      direct.error,
      state.betting_ends_at,
      serverNowIso
    );

    if (direct.error && !direct.error.includes("0 ligne")) {
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
          progressed ? null : "phase inchangée après direct betting→flying",
          afterDirect.betting_ends_at,
          serverNowIso
        );
        state = afterDirect;
        if (
          !progressed &&
          serverStateNeedsDirectBettingFallback(state, supabaseNowMs)
        ) {
          lastError =
            lastError ??
            `Manche bloquée en betting: betting_ends_at=${state.betting_ends_at}, server_now=${serverNowIso}`;
          break;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    if (
      afterRpc &&
      afterRpc.phase === phaseBefore &&
      serverStateNeedsDirectBettingFallback(state, supabaseNowMs)
    ) {
      lastError =
        lastError ??
        "crash_advance_tick n'a pas démarré le vol alors que betting_ends_at est dépassé";
    }
  }

  supabaseNowMs = (await fetchSupabaseNowMs(supabase)) ?? supabaseNowMs;

  return { state, tickLog, lastError, serverTimeMs: supabaseNowMs };
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
  const serviceRoleConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );

  const supabase = createCrashLoopClient();

  if (!supabase) {
    return {
      state: createFallbackCrashState(),
      history: [],
      bets: [],
      serverTime: null,
      error: "Clés Supabase manquantes (SUPABASE_SERVICE_ROLE_KEY ou ANON)",
      source: "fallback",
      tickLog: [],
      needsAdvance: false,
      serviceRoleConfigured,
    };
  }

  try {
    const { state, tickLog, lastError, serverTimeMs } = await syncCrashLoop(
      supabase,
      options?.maxSteps
    );
    const serverTime = serverTimeMs ?? (await fetchSupabaseNowMs(supabase));
    const needsAdvance =
      serverTime != null ? serverStateStuck(state, serverTime) : false;
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
      state: createFallbackCrashState(),
      history: [],
      bets: [],
      serverTime: null,
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
