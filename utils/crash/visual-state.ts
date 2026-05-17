import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";
import { parseIsoMs } from "@/utils/crash/datetime";
import { multiplierAtElapsedMs } from "@/utils/crash/engine";
import type { CrashPhase, CrashPublicState } from "@/utils/crash/types";

const CRASH_DISPLAY_MS = 3000;

export interface CrashVisualState {
  phase: CrashPhase;
  multiplier: number;
  bettingSecondsLeft: number | null;
  flyingStartedAt: string | null;
  crashPoint: number | null;
  /** Affichage basé sur l'horloge locale (en attente de sync serveur). */
  awaitingServerSync: boolean;
}

/**
 * Dérive l'affichage à partir des timestamps Supabase + horloge locale.
 * Le jeu reste fluide même si Realtime ou les RPC client échouent.
 */
export function deriveVisualState(
  server: CrashPublicState | null,
  now = Date.now()
): CrashVisualState {
  if (!server) {
    return {
      phase: "betting",
      multiplier: 1,
      bettingSecondsLeft: null,
      flyingStartedAt: null,
      crashPoint: null,
      awaitingServerSync: true,
    };
  }

  const bettingEnd = parseIsoMs(server.betting_ends_at);
  const flyingStart = parseIsoMs(server.flying_started_at);
  const crashedAt = parseIsoMs(server.crashed_at);

  if (server.phase === "betting") {
    if (bettingEnd !== null && now >= bettingEnd) {
      const elapsed = now - bettingEnd;
      return {
        phase: "flying",
        multiplier: multiplierAtElapsedMs(elapsed),
        bettingSecondsLeft: 0,
        flyingStartedAt: new Date(bettingEnd).toISOString(),
        crashPoint: null,
        awaitingServerSync: true,
      };
    }

    const left =
      bettingEnd === null
        ? null
        : Math.max(
            0,
            Math.min(
              CRASH_BETTING_SECONDS + 1,
              Math.ceil((bettingEnd - now) / 1000)
            )
          );

    return {
      phase: "betting",
      multiplier: 1,
      bettingSecondsLeft: left,
      flyingStartedAt: null,
      crashPoint: null,
      awaitingServerSync: bettingEnd === null,
    };
  }

  if (server.phase === "flying") {
    const start = flyingStart ?? bettingEnd ?? now;
    return {
      phase: "flying",
      multiplier: multiplierAtElapsedMs(Math.max(0, now - start)),
      bettingSecondsLeft: null,
      flyingStartedAt: server.flying_started_at,
      crashPoint: null,
      awaitingServerSync: flyingStart === null,
    };
  }

  if (server.phase === "crashed") {
    const point = server.crash_point ?? 1;
    if (crashedAt !== null && now < crashedAt + CRASH_DISPLAY_MS) {
      return {
        phase: "crashed",
        multiplier: point,
        bettingSecondsLeft: null,
        flyingStartedAt: server.flying_started_at,
        crashPoint: point,
        awaitingServerSync: false,
      };
    }

    return {
      phase: "betting",
      multiplier: 1,
      bettingSecondsLeft: null,
      flyingStartedAt: null,
      crashPoint: point,
      awaitingServerSync: true,
    };
  }

  return {
    phase: server.phase,
    multiplier: 1,
    bettingSecondsLeft: null,
    flyingStartedAt: server.flying_started_at,
    crashPoint: server.crash_point,
    awaitingServerSync: false,
  };
}

export function serverStateNeedsAdvance(
  state: CrashPublicState,
  now = Date.now()
): boolean {
  const bettingEnd = parseIsoMs(state.betting_ends_at);
  const crashedAt = parseIsoMs(state.crashed_at);

  if (state.phase === "betting") {
    return bettingEnd === null || now >= bettingEnd;
  }
  if (state.phase === "flying") {
    return true;
  }
  if (state.phase === "crashed") {
    return crashedAt === null || now >= crashedAt + CRASH_DISPLAY_MS;
  }
  return true;
}
