import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";
import type { CrashPublicState } from "@/utils/crash/types";

/** État de secours si Supabase est inaccessible (UI non bloquée). */
export function createFallbackCrashState(
  serverTime = Date.now()
): CrashPublicState {
  const ends = new Date(
    serverTime + CRASH_BETTING_SECONDS * 1000
  ).toISOString();

  return {
    round_id: "00000000-0000-4000-8000-000000000001",
    round_number: 1,
    phase: "betting",
    betting_ends_at: ends,
    flying_started_at: null,
    crashed_at: null,
    crash_point: null,
  };
}
