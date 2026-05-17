import type { SupabaseClient } from "@supabase/supabase-js";
import { createFallbackCrashState } from "@/utils/crash/default-state";
import { parseCrashState } from "@/utils/crash/parse-state";
import { serverStateNeedsAdvance } from "@/utils/crash/visual-state";
import type { CrashBetRow, CrashPublicState } from "@/utils/crash/types";
import type { Database } from "@/utils/supabase/database.types";
import { createCrashLoopClient } from "@/utils/supabase/crash-server";

export const CRASH_LOOP_MAX_STEPS = 16;

export interface CrashSnapshot {
  state: CrashPublicState;
  history: number[];
  bets: CrashBetRow[];
  serverTime: number;
  error: string | null;
  source: "supabase" | "fallback";
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

async function rpcRepair(supabase: SupabaseClient<Database>): Promise<void> {
  try {
    await supabase.rpc("crash_repair_live_state");
  } catch {
    /* fonction absente — bootstrap direct ci-dessous */
  }
}

/** Réinitialise / répare la room via RPC (security definer, ne plante pas). */
async function bootstrapCrashRoom(
  supabase: SupabaseClient<Database>
): Promise<void> {
  await rpcRepair(supabase);

  for (let i = 0; i < 4; i++) {
    try {
      await rpcAdvanceTick(supabase);
    } catch {
      break;
    }
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

  if (error || !data) return null;
  return rowToState(data as Record<string, unknown>);
}

async function rpcGetState(
  supabase: SupabaseClient<Database>
): Promise<CrashPublicState | null> {
  const { data, error } = await supabase.rpc("crash_get_state");
  if (error) throw new Error(error.message);
  return parseCrashState(data);
}

async function rpcAdvanceTick(
  supabase: SupabaseClient<Database>
): Promise<CrashPublicState | null> {
  const { data, error } = await supabase.rpc("crash_advance_tick");
  if (error) throw new Error(error.message);
  return parseCrashState(data);
}

export async function syncCrashLoop(
  supabase: SupabaseClient<Database>,
  maxSteps = CRASH_LOOP_MAX_STEPS
): Promise<CrashPublicState> {
  await bootstrapCrashRoom(supabase);

  let state: CrashPublicState | null = null;

  try {
    state = await rpcGetState(supabase);
  } catch {
    state = await readStateDirect(supabase);
  }

  if (!state) {
    state = await readStateDirect(supabase);
  }

  if (!state) {
    await bootstrapCrashRoom(supabase);
    state = await readStateDirect(supabase);
  }

  if (!state) {
    return createFallbackCrashState();
  }

  for (let i = 0; i < maxSteps; i++) {
    if (!serverStateNeedsAdvance(state)) break;

    let next: CrashPublicState | null = null;
    try {
      next = await rpcAdvanceTick(supabase);
    } catch {
      break;
    }

    if (!next) break;

    const unchanged =
      next.phase === state.phase &&
      next.round_id === state.round_id &&
      next.betting_ends_at === state.betting_ends_at &&
      next.flying_started_at === state.flying_started_at &&
      next.crashed_at === state.crashed_at;

    state = next;
    if (unchanged) break;
  }

  if (serverStateNeedsAdvance(state)) {
    try {
      const forced = await rpcAdvanceTick(supabase);
      if (forced) state = forced;
    } catch {
      /* garde l'état actuel */
    }
  }

  return state;
}

async function fetchHistory(
  supabase: SupabaseClient<Database>,
  limit = 12
): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from("crash_round_history")
      .select("crash_point")
      .order("id", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []).map((r) => Number(r.crash_point));
  } catch {
    return [];
  }
}

async function fetchBets(
  supabase: SupabaseClient<Database>,
  roundId: string
): Promise<CrashBetRow[]> {
  try {
    const { data, error } = await supabase
      .from("crash_bets")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) return [];
    return (data ?? []) as CrashBetRow[];
  } catch {
    return [];
  }
}

export async function runCrashSnapshot(options?: {
  maxSteps?: number;
}): Promise<CrashSnapshot> {
  const serverTime = Date.now();
  const supabase = createCrashLoopClient();

  if (!supabase) {
    return {
      state: createFallbackCrashState(serverTime),
      history: [],
      bets: [],
      serverTime,
      error: "Clés Supabase manquantes sur le serveur",
      source: "fallback",
    };
  }

  try {
    const state = await syncCrashLoop(supabase, options?.maxSteps);
    const history = await fetchHistory(supabase);
    const bets = await fetchBets(supabase, state.round_id);

    return {
      state,
      history,
      bets,
      serverTime,
      error: null,
      source: "supabase",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur Crash";

    try {
      await bootstrapCrashRoom(supabase);
      const state = await syncCrashLoop(supabase, options?.maxSteps);
      return {
        state,
        history: await fetchHistory(supabase),
        bets: await fetchBets(supabase, state.round_id),
        serverTime,
        error: message,
        source: "supabase",
      };
    } catch {
      return {
        state: createFallbackCrashState(serverTime),
        history: [],
        bets: [],
        serverTime,
        error: message,
        source: "fallback",
      };
    }
  }
}

export async function fetchCrashSnapshotServer(): Promise<CrashSnapshot> {
  return runCrashSnapshot();
}
