import type { SupabaseClient } from "@supabase/supabase-js";
import { parseIsoMs } from "@/utils/crash/datetime";
import type { Database } from "@/utils/supabase/database.types";

/**
 * Horloge Postgres (Supabase), jamais l'horloge Vercel/Node.
 * Nécessite la RPC `crash_server_now()` (voir supabase/crash-server-now.sql).
 */
export async function fetchSupabaseNowMs(
  supabase: SupabaseClient<Database>
): Promise<number | null> {
  const { data, error } = await supabase.rpc("crash_server_now");

  if (error || data == null) return null;

  const raw =
    typeof data === "string"
      ? data
      : typeof data === "object" && data !== null && "now" in data
        ? String((data as { now: unknown }).now)
        : String(data);

  return parseIsoMs(raw);
}
