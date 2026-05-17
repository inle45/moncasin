import { parseCrashState } from "@/utils/crash/parse-state";
import type { CrashPublicState } from "@/utils/crash/types";
import {
  advanceCrashTick,
  fetchCrashStateFromTable,
} from "@/utils/supabase/crash-room";

/** Avance la manche via RPC, puis relit la table / API loop. */
export async function advanceCrashFromClient(): Promise<CrashPublicState | null> {
  const { data, error } = await advanceCrashTick();
  if (data && !error) return data;

  const fromTable = await fetchCrashStateFromTable();
  if (fromTable.data) return fromTable.data;

  try {
    const res = await fetch("/api/crash/loop", { cache: "no-store" });
    if (!res.ok) return fromTable.data;
    const body = (await res.json()) as { state?: unknown };
    return parseCrashState(body.state) ?? fromTable.data;
  } catch {
    return fromTable.data;
  }
}
