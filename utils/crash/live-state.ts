import { parseCrashState } from "@/utils/crash/parse-state";
import type { CrashPublicState } from "@/utils/crash/types";

/** Convertit une ligne `crash_live_state` (Realtime ou select) en état public. */
export function liveStateRowToPublic(
  row: Record<string, unknown> | null | undefined
): CrashPublicState | null {
  if (!row) return null;
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
