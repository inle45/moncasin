import type { CrashPublicState } from "@/utils/crash/types";
import { normalizeRoundId } from "@/utils/crash/uuid";

export function parseIsoField(value: unknown): string | null {
  if (value == null || value === "null" || value === "undefined") return null;
  const s = String(value).trim();
  if (!s || s === "null") return null;
  const ms = new Date(s).getTime();
  return Number.isFinite(ms) ? s : null;
}

export interface CrashStatePayload {
  state: CrashPublicState | null;
  /** Horloge Postgres (`crash_get_state.server_now` ou RPC dédiée). */
  serverNowMs: number | null;
}

export function parseCrashStatePayload(raw: unknown): CrashStatePayload {
  if (!raw || typeof raw !== "object") {
    return { state: null, serverNowMs: null };
  }
  const o = raw as Record<string, unknown>;
  const phase = o.phase as CrashPublicState["phase"];
  if (!["betting", "flying", "crashed"].includes(phase)) {
    return { state: null, serverNowMs: null };
  }

  const roundId = normalizeRoundId(o.round_id);
  if (!roundId) return { state: null, serverNowMs: null };

  const serverNowRaw = o.server_now ?? o.serverNow;
  const serverNowMs = serverNowRaw
    ? (() => {
        const s = String(serverNowRaw).trim();
        const ms = new Date(s).getTime();
        return Number.isFinite(ms) ? ms : null;
      })()
    : null;

  return {
    state: {
      round_id: roundId,
      round_number: Number(o.round_number) || 0,
      phase,
      betting_ends_at: parseIsoField(o.betting_ends_at),
      flying_started_at: parseIsoField(o.flying_started_at),
      crashed_at: parseIsoField(o.crashed_at),
      crash_point: o.crash_point != null ? Number(o.crash_point) : null,
    },
    serverNowMs,
  };
}

export function parseCrashState(raw: unknown): CrashPublicState | null {
  return parseCrashStatePayload(raw).state;
}
