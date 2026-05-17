const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalise un UUID Supabase (minuscules) ou retourne null. */
export function normalizeRoundId(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!UUID_RE.test(s)) return null;
  return s.toLowerCase();
}
