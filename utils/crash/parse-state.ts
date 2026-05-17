import type { CrashPublicState } from "@/utils/crash/types";

export function parseIsoField(value: unknown): string | null {
  if (value == null || value === "null" || value === "undefined") return null;
  const s = String(value).trim();
  if (!s || s === "null") return null;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? s : null;
}

export function parseCrashState(raw: unknown): CrashPublicState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const phase = o.phase as CrashPublicState["phase"];
  if (!["betting", "flying", "crashed"].includes(phase)) return null;

  const roundId = String(o.round_id ?? "").trim();
  if (!roundId) return null;

  return {
    round_id: roundId,
    round_number: Number(o.round_number) || 0,
    phase,
    betting_ends_at: parseIsoField(o.betting_ends_at),
    flying_started_at: parseIsoField(o.flying_started_at),
    crashed_at: parseIsoField(o.crashed_at),
    crash_point: o.crash_point != null ? Number(o.crash_point) : null,
  };
}
