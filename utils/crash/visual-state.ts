import { computeBettingSecondsLeft, parseIsoMs } from "@/utils/crash/datetime";
import { multiplierAtSecondsElapsed } from "@/utils/crash/engine";
import type { CrashPhase, CrashPublicState } from "@/utils/crash/types";

const CRASH_DISPLAY_MS = 3000;

export interface CrashVisualState {
  phase: CrashPhase;
  multiplier: number;
  bettingSecondsLeft: number | null;
  flyingStartedAt: string | null;
  crashPoint: number | null;
  /** Timestamps manquants ou horloge pas encore synchronisée. */
  awaitingServerSync: boolean;
}

export interface DeriveVisualStateOptions {
  postgresClockSynced?: boolean;
  /** offsetMs = heure Postgres − Date.now() au moment de la sync. */
  offsetMs?: number;
}

/**
 * Dérive l'affichage à partir des timestamps Supabase.
 * Vol : uniquement si `flying_started_at` est présent ;
 * seconds_elapsed = (Date.now() + offsetMs − flying_started_at) / 1000
 */
export function deriveVisualState(
  server: CrashPublicState | null,
  nowMs = Date.now(),
  options?: DeriveVisualStateOptions
): CrashVisualState {
  const clockOk = options?.postgresClockSynced !== false;
  const offsetMs = options?.offsetMs ?? nowMs - Date.now();

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
  const crashedAt = parseIsoMs(server.crashed_at);
  const syncedNowMs = Date.now() + offsetMs;

  if (server.phase === "betting") {
    return {
      phase: "betting",
      multiplier: 1,
      bettingSecondsLeft: computeBettingSecondsLeft(
        server.betting_ends_at,
        syncedNowMs
      ),
      flyingStartedAt: null,
      crashPoint: null,
      awaitingServerSync: bettingEnd === null || !clockOk,
    };
  }

  if (server.phase === "flying") {
    if (!server.flying_started_at) {
      return {
        phase: "flying",
        multiplier: 1,
        bettingSecondsLeft: null,
        flyingStartedAt: null,
        crashPoint: null,
        awaitingServerSync: true,
      };
    }

    const flyingStartMs = new Date(server.flying_started_at).getTime();
    if (!Number.isFinite(flyingStartMs)) {
      return {
        phase: "flying",
        multiplier: 1,
        bettingSecondsLeft: null,
        flyingStartedAt: server.flying_started_at,
        crashPoint: null,
        awaitingServerSync: true,
      };
    }

    const secondsElapsed = Math.max(
      0,
      (Date.now() + offsetMs - flyingStartMs) / 1000
    );

    return {
      phase: "flying",
      multiplier: multiplierAtSecondsElapsed(secondsElapsed),
      bettingSecondsLeft: null,
      flyingStartedAt: server.flying_started_at,
      crashPoint: null,
      awaitingServerSync: !clockOk,
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
