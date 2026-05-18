import {
  CRASH_HOUSE_EDGE,
  CRASH_MAX_MULTIPLIER,
  CRASH_MULTIPLIER_BASE,
} from "./constants";

/** Point de crash tiré (caché jusqu'à l'explosion). */
export function generateCrashPoint(): number {
  const r = Math.random();
  const raw = (1 - CRASH_HOUSE_EDGE) / (1 - r);
  const capped = Math.min(raw, CRASH_MAX_MULTIPLIER);
  return Math.max(1.01, Math.floor(capped * 100) / 100);
}

/**
 * Même formule que Supabase `crash_current_multiplier` :
 * round(pow(1.06, seconds_elapsed) * 100) / 100
 */
export function multiplierAtSecondsElapsed(secondsElapsed: number): number {
  if (secondsElapsed <= 0) return 1;
  return (
    Math.round(Math.pow(CRASH_MULTIPLIER_BASE, secondsElapsed) * 100) / 100
  );
}

export function multiplierAtElapsedMs(elapsedMs: number): number {
  return multiplierAtSecondsElapsed(elapsedMs / 1000);
}

export function elapsedMsForMultiplier(multiplier: number): number {
  if (multiplier <= 1) return 0;
  return (
    (Math.log(multiplier) / Math.log(CRASH_MULTIPLIER_BASE)) * 1000
  );
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function calculateCashoutPayout(bet: number, multiplier: number): number {
  return Math.max(0, Math.floor(bet * multiplier));
}
