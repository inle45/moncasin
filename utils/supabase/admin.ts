import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { normalizeAnonKey } from "./config";

/**
 * Client serveur (service role) — uniquement dans les Route Handlers / cron.
 * Nécessite SUPABASE_SERVICE_ROLE_KEY dans Vercel.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ??
    process.env.SUPABASE_SERVICE_KEY?.trim();

  if (!url || !serviceKey) return null;

  return createClient<Database>(url, normalizeAnonKey(serviceKey), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
