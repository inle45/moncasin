import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import {
  getAppMode,
  isDemoMode,
  isSupabaseConfigured,
} from "./config";
import { getBrowserClientConfigError, getPublicSupabaseEnv } from "./env";
import { withTimeout } from "./timeout";

/** Évalué au chargement du bundle — préférer isDemoMode() pour la logique runtime. */
export const DEMO_MODE = isDemoMode();
export const APP_MODE = getAppMode();

const AUTH_REQUEST_TIMEOUT_MS = 12000;
const DB_REQUEST_TIMEOUT_MS = 8000;

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

/**
 * Client Supabase navigateur (clé ANON / publishable uniquement).
 * Ne lit jamais SUPABASE_SERVICE_ROLE_KEY.
 */
export function createClient() {
  if (isDemoMode()) return null;

  const configError = getBrowserClientConfigError();
  if (configError) {
    if (typeof console !== "undefined") {
      console.error("[MonCasin] Supabase client:", configError);
    }
    return null;
  }

  if (!browserClient) {
    const env = getPublicSupabaseEnv();
    if (!env) return null;

    browserClient = createBrowserClient<Database>(env.url, env.anonKey);
  }

  return browserClient;
}

export { isDemoMode, isSupabaseConfigured, getAppMode, getBrowserClientConfigError };

/**
 * Récupère l'utilisateur connecté avec timeout. En mode démo ou en cas d'échec → `user: null`.
 */
export async function safeGetUser(): Promise<{
  user: User | null;
  timedOut: boolean;
}> {
  if (isDemoMode()) {
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
  if (isDemoMode()) {
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
