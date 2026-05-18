/**
 * Horloge UI = Postgres au moment de la sync + écoulement monotone du navigateur.
 * offset = serverNowMs - clientNowMs (jamais Date.now() Vercel).
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

/** Ancrage Postgres + horloge monotone locale (meilleur entre deux sync RPC). */
export function postgresNowFromAnchor(
  postgresAnchorMs: number,
  clientAnchorMs: number,
  clientNowMs = Date.now()
): number {
  return postgresAnchorMs + (clientNowMs - clientAnchorMs);
}
