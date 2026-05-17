import { isSupabaseConfigured, normalizeAnonKey } from "./config";

export interface PublicSupabaseEnv {
  url: string;
  anonKey: string;
}

export interface ServiceSupabaseEnv {
  url: string;
  serviceRoleKey: string;
}

/** Détecte une clé service_role utilisée par erreur côté navigateur. */
export function isServiceRoleKey(key: string): boolean {
  const trimmed = key.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("sb_secret_")) return true;
  if (lower.includes("service_role")) return true;

  if (!trimmed.startsWith("eyJ")) return false;

  try {
    const segment = trimmed.split(".")[1];
    if (!segment) return false;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/** URL + clé ANON / publishable uniquement (jamais service_role). */
export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
  if (!isSupabaseConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = normalizeAnonKey(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  if (!url || !anonKey) return null;
  if (isServiceRoleKey(anonKey)) return null;

  return { url, anonKey };
}

/** Clé service_role — serveur uniquement (Route Handlers, cron). */
export function getServiceSupabaseEnv(): ServiceSupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_KEY?.trim() ??
    "";

  if (!url || !serviceRoleKey) return null;

  return { url, serviceRoleKey };
}

export function getBrowserClientConfigError(): string | null {
  if (!isSupabaseConfigured()) {
    return "Supabase non configuré : ajoute NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sur Vercel.";
  }

  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (isServiceRoleKey(normalizeAnonKey(rawKey))) {
    return "Erreur de configuration : NEXT_PUBLIC_SUPABASE_ANON_KEY contient la clé service_role. Sur Vercel, mets la clé « anon » ou « publishable » (publique) dans ANON_KEY, et la clé « service_role » uniquement dans SUPABASE_SERVICE_ROLE_KEY.";
  }

  if (!getPublicSupabaseEnv()) {
    return "Configuration Supabase invalide pour le navigateur.";
  }

  return null;
}
