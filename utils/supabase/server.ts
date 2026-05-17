import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

/**
 * Client Supabase serveur (SSR / Server Components) — clé ANON uniquement.
 * Distinct de createServiceClient() (service_role) dans admin.ts.
 */
export function createSupabaseServerClient() {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const cookieStore = cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          /* Server Component en lecture seule */
        }
      },
      remove(name: string, options) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          /* Server Component en lecture seule */
        }
      },
    },
  });
}
