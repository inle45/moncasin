/** Valeurs par défaut du fichier .env.local (mode démo forcé) */
const DEFAULT_URL = "https://votre-projet.supabase.co";
const DEFAULT_ANON_KEY = "votre_cle_anon_publique_ici";

const PLACEHOLDER_MARKERS = [
  "votre-projet",
  "votre_cle",
  "your-project",
  "your-anon",
  "example.supabase",
  "xxx.supabase",
  "placeholder",
  "changeme",
  "replace_me",
  "insert_",
];

function envUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function envAnonKey(): string {
  return normalizeAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "");
}

/** Corrige la casse courante (Sb_publishable → sb_publishable). */
export function normalizeAnonKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.startsWith("Sb_publishable_")) {
    return `sb_publishable_${trimmed.slice("Sb_publishable_".length)}`;
  }
  return trimmed;
}

function isValidAnonKeyFormat(key: string): boolean {
  if (key.startsWith("eyJ") && key.length >= 100) return true;
  if (key.startsWith("sb_publishable_") && key.length >= 45) return true;
  return false;
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  if (!value || lower === "undefined" || lower === "null") return true;
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * true uniquement si URL + clé anon sont présentes et ne sont pas des placeholders.
 */
export function isSupabaseConfigured(): boolean {
  const url = envUrl();
  const anonKey = envAnonKey();

  if (!url || !anonKey) return false;
  if (url === DEFAULT_URL || anonKey === DEFAULT_ANON_KEY) return false;
  if (looksLikePlaceholder(url) || looksLikePlaceholder(anonKey)) return false;

  if (!isValidAnonKeyFormat(anonKey)) return false;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("supabase")) return false;
  } catch {
    return false;
  }

  return true;
}

/**
 * Mode démo local : aucune requête cloud, données fictives uniquement.
 */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export type AppMode = "demo" | "live";

export function getAppMode(): AppMode {
  return isDemoMode() ? "demo" : "live";
}
