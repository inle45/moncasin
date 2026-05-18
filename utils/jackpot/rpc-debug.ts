/** Logs détaillés RPC jackpot (console navigateur). */
export const JACKPOT_RPC_DEBUG = true;

export function logJackpotRpc(
  label: string,
  payload: Record<string, unknown>
): void {
  if (!JACKPOT_RPC_DEBUG || typeof console === "undefined") return;
  console.groupCollapsed(`[MonCasin Jackpot] ${label}`);
  console.log(payload);
  console.groupEnd();
}
