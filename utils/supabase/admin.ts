import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getServiceSupabaseEnv } from "./env";

/**
 * Client serveur (service_role) — Route Handlers / cron uniquement.
 * N'utilise jamais NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export function createServiceClient() {
  const env = getServiceSupabaseEnv();
  if (!env) return null;

  return createClient<Database>(env.url, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
