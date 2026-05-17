const PREFIX = "[MonCasin crash tick]";

/** Logs visibles dans la console navigateur (F12) et Vercel Runtime Logs pour l'API. */
export function logCrashTick(
  level: "info" | "warn" | "error",
  message: string,
  detail?: unknown
): void {
  const payload = detail !== undefined ? detail : "";
  if (level === "error") {
    console.error(PREFIX, message, payload);
    return;
  }
  if (level === "warn") {
    console.warn(PREFIX, message, payload);
    return;
  }
  console.info(PREFIX, message, payload);
}
