import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createServiceClient } from "./admin";
import { getPublicSupabaseEnv } from "./env";

/**
 * Client pour la boucle Crash côté serveur (API routes).
 * 1. service_role si disponible
 * 2. sinon clé ANON (les RPC crash_* sont grantées à anon)
 */
export function createCrashLoopClient(): SupabaseClient<Database> | null {
  const service = createServiceClient();
  if (service) return service;

  const pub = getPublicSupabaseEnv();
  if (!pub) return null;

  return createClient<Database>(pub.url, pub.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
