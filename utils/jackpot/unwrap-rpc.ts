/** Normalise la réponse PostgREST (jsonb parfois renvoyé en string). */
export function unwrapRpcJson(data: unknown): unknown {
  if (data == null) return null;
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return data;
    }
  }
  return data;
}

export function isRpcOk(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}
