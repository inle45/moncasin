/**
 * Décalage horaire client ↔ Supabase : offset = serverNow - clientNow au moment de la sync.
 * Utiliser syncedNowMs(offset) pour l'UI (aligné sur crash_current_multiplier).
 */
export function computeClockOffsetMs(
  serverTimeMs: number,
  clientNowMs = Date.now()
): number {
  if (!Number.isFinite(serverTimeMs)) return 0;
  return serverTimeMs - clientNowMs;
}

export function syncedNowMs(
  clockOffsetMs: number,
  clientNowMs = Date.now()
): number {
  return clientNowMs + clockOffsetMs;
}
