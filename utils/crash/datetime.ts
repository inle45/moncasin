import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";

/** Timestamp ISO valide (évite la chaîne littérale "null" renvoyée par parseState). */
export function parseIsoMs(value: string | null | undefined): number | null {
  if (value == null || value === "" || value === "null" || value === "undefined") {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isValidIsoTimestamp(value: string | null | undefined): boolean {
  return parseIsoMs(value) !== null;
}

/** Secondes restantes pour miser ; `null` = chrono non synchronisé (afficher « Sync… »). */
export function computeBettingSecondsLeft(
  bettingEndsAt: string | null | undefined,
  nowMs = Date.now()
): number | null {
  const endsMs = parseIsoMs(bettingEndsAt);
  if (endsMs === null) return null;
  const left = Math.ceil((endsMs - nowMs) / 1000);
  if (!Number.isFinite(left)) return null;
  return Math.max(0, Math.min(CRASH_BETTING_SECONDS + 1, left));
}
