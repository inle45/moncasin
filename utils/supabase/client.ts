import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  getAppMode,
  isDemoMode,
  isSupabaseConfigured,
  normalizeAnonKey,
} from "./config";
import { withTimeout } from "./timeout";

/** Évalué une fois au chargement du bundle client */
export const DEMO_MODE = isDemoMode();
export const APP_MODE = getAppMode();

const AUTH_REQUEST_TIMEOUT_MS = 3000;
const DB_REQUEST_TIMEOUT_MS = 5000;

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

/**
 * Client Supabase navigateur. Retourne `null` en mode démo — ne jamais bloquer l'UI.
 */
export function createClient() {
  if (DEMO_MODE) return null;

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const anonKey = normalizeAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}

export { isDemoMode, isSupabaseConfigured, getAppMode };

/**
 * Récupère l'utilisateur connecté avec timeout. En mode démo ou en cas d'échec → `user: null`.
 */
export async function safeGetUser(): Promise<{
  user: User | null;
  timedOut: boolean;
}> {
  if (DEMO_MODE) {
    return { user: null, timedOut: false };
  }

  const supabase = createClient();
  if (!supabase) {
    return { user: null, timedOut: false };
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_REQUEST_TIMEOUT_MS,
      "auth.getUser"
    );

    if (error) {
      return { user: null, timedOut: false };
    }

    return { user: data.user, timedOut: false };
  } catch {
    return { user: null, timedOut: true };
  }
}

/**
 * Enveloppe une requête Supabase avec timeout (profils, classement, etc.).
 */
export async function safeQuery<T>(
  query: PromiseLike<T>,
  timeoutMs = DB_REQUEST_TIMEOUT_MS
): Promise<{ data: T | null; timedOut: boolean; error: unknown }> {
  if (DEMO_MODE) {
    return { data: null, timedOut: false, error: null };
  }

  try {
    const data = await withTimeout(
      Promise.resolve(query),
      timeoutMs,
      "supabase.query"
    );
    return { data, timedOut: false, error: null };
  } catch (err) {
    return { data: null, timedOut: true, error: err };
  }
}
