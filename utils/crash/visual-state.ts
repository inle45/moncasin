import { computeBettingSecondsLeft, parseIsoMs } from "@/utils/crash/datetime";
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
    return {
      phase: "betting",
      multiplier: 1,
      bettingSecondsLeft: computeBettingSecondsLeft(server.betting_ends_at),
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
    return {
      phase: "crashed",
      multiplier: point,
      bettingSecondsLeft: null,
      flyingStartedAt: server.flying_started_at,
      crashPoint: point,
      awaitingServerSync: crashedAt === null,
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

/**
 * La boucle serveur doit appeler `crash_advance_tick` (horloge Postgres).
 * En phase flying, seule la RPC décide du crash (multiplicateur vs crash_point).
 */
export function serverStateNeedsRpcTick(
  state: CrashPublicState,
  nowMs: number
): boolean {
  const bettingEnd = parseIsoMs(state.betting_ends_at);
  const crashedAt = parseIsoMs(state.crashed_at);

  if (state.phase === "betting") {
    return bettingEnd === null || nowMs >= bettingEnd;
  }
  if (state.phase === "flying") {
    return true;
  }
  if (state.phase === "crashed") {
    return crashedAt === null || nowMs >= crashedAt + CRASH_DISPLAY_MS;
  }
  return true;
}

/** Fallback UPDATE direct uniquement si les mises sont terminées mais phase encore betting. */
export function serverStateNeedsDirectBettingFallback(
  state: CrashPublicState,
  nowMs: number
): boolean {
  if (state.phase !== "betting") return false;
  const bettingEnd = parseIsoMs(state.betting_ends_at);
  return bettingEnd === null || nowMs >= bettingEnd;
}

/** Manche bloquée côté API (pas le vol normal en flying). */
export function serverStateStuck(
  state: CrashPublicState,
  nowMs: number
): boolean {
  if (state.phase === "flying") return false;

  const bettingEnd = parseIsoMs(state.betting_ends_at);
  const crashedAt = parseIsoMs(state.crashed_at);

  if (state.phase === "betting") {
    return bettingEnd !== null && nowMs >= bettingEnd;
  }
  if (state.phase === "crashed") {
    return crashedAt !== null && nowMs >= crashedAt + CRASH_DISPLAY_MS;
  }
  return false;
}

/** @deprecated Utiliser serverStateNeedsRpcTick ou serverStateStuck */
export function serverStateNeedsAdvance(
  state: CrashPublicState,
  nowMs = Date.now()
): boolean {
  return serverStateStuck(state, nowMs) || serverStateNeedsRpcTick(state, nowMs);
}
