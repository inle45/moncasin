import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCrashState } from "@/utils/crash/parse-state";
import { serverStateNeedsAdvance } from "@/utils/crash/visual-state";
import type { CrashBetRow, CrashPublicState } from "@/utils/crash/types";
import type { Database } from "@/utils/supabase/database.types";
import { createServiceClient } from "@/utils/supabase/admin";

export const CRASH_LOOP_MAX_STEPS = 12;

export interface CrashSnapshot {
  state: CrashPublicState | null;
  history: number[];
  bets: CrashBetRow[];
  serverTime: number;
  error: string | null;
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

/** Avance la machine à états jusqu'à être à jour (service role). */
export async function syncCrashLoop(
  supabase: SupabaseClient<Database>,
  maxSteps = CRASH_LOOP_MAX_STEPS
): Promise<CrashPublicState | null> {
  let state = await rpcGetState(supabase);
  if (!state) return null;

  for (let i = 0; i < maxSteps; i++) {
    if (!serverStateNeedsAdvance(state)) break;

    const next = await rpcAdvanceTick(supabase);
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

  return state;
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
  roundId?: string | null;
  maxSteps?: number;
}): Promise<CrashSnapshot> {
  const supabase = createServiceClient();
  const serverTime = Date.now();

  if (!supabase) {
    return {
      state: null,
      history: [],
      bets: [],
      serverTime,
      error:
        "SUPABASE_SERVICE_ROLE_KEY manquant — configure la clé sur Vercel.",
    };
  }

  try {
    const state = await syncCrashLoop(supabase, options?.maxSteps);
    const history = await fetchHistory(supabase);
    const bets = state?.round_id
      ? await fetchBets(supabase, state.round_id)
      : [];

    return { state, history, bets, serverTime, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur serveur Crash";
    return {
      state: null,
      history: [],
      bets: [],
      serverTime,
      error: message,
    };
  }
}

/** Initialisation côté serveur (page /crash). */
export async function fetchCrashSnapshotServer(): Promise<CrashSnapshot> {
  return runCrashSnapshot();
}
