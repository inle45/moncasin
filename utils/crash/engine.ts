import {
  CRASH_GROWTH_RATE,
  CRASH_HOUSE_EDGE,
  CRASH_MAX_MULTIPLIER,
} from "./constants";

/** Point de crash tiré (caché jusqu'à l'explosion). */
export function generateCrashPoint(): number {
  const r = Math.random();
  const raw = (1 - CRASH_HOUSE_EDGE) / (1 - r);
  const capped = Math.min(raw, CRASH_MAX_MULTIPLIER);
  return Math.max(1.01, Math.floor(capped * 100) / 100);
}

export function multiplierAtElapsedMs(elapsedMs: number): number {
  const seconds = elapsedMs / 1000;
  const value = Math.exp(CRASH_GROWTH_RATE * seconds);
  return Math.floor(value * 100) / 100;
}

export function elapsedMsForMultiplier(multiplier: number): number {
  if (multiplier <= 1) return 0;
  return (Math.log(multiplier) / CRASH_GROWTH_RATE) * 1000;
}

export function formatMultiplier(value: number): string {
  return `${value.toFixed(2)}x`;
}

export function calculateCashoutPayout(bet: number, multiplier: number): number {
  return Math.max(0, Math.floor(bet * multiplier));
}
