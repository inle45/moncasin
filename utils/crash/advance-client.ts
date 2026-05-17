import { parseCrashState } from "@/utils/crash/parse-state";
import type { CrashPublicState } from "@/utils/crash/types";
import { advanceCrashTick } from "@/utils/supabase/crash-room";

/** Avance la manche via RPC client, puis API loop en secours. */
export async function advanceCrashFromClient(): Promise<CrashPublicState | null> {
  const { data, error } = await advanceCrashTick();
  if (data && !error) return data;

  try {
    const res = await fetch("/api/crash/loop", { cache: "no-store" });
    if (!res.ok) return data;
    const body = (await res.json()) as { state?: unknown };
    return parseCrashState(body.state);
  } catch {
    return data;
  }
}
