import { parseCrashState } from "@/utils/crash/parse-state";
import type { CrashPublicState } from "@/utils/crash/types";
import {
  advanceCrashTick,
  fetchCrashStateFromTable,
} from "@/utils/supabase/crash-room";

/** Signature stable pour éviter les re-renders inutiles (chrono 4↔3). */
export function crashStateSignature(state: CrashPublicState): string {
  return [
    state.phase,
    state.round_id,
    state.round_number,
    state.betting_ends_at ?? "",
    state.flying_started_at ?? "",
    state.crashed_at ?? "",
    state.crash_point ?? "",
  ].join("|");
}

/**
 * Avance la manche : RPC client → API serveur (/api/crash/loop) → lecture table.
 * La lecture seule ne fait PAS avancer la DB (évite la boucle chrono).
 */
export async function runCrashLoopTick(): Promise<CrashPublicState | null> {
  const rpc = await advanceCrashTick();
  if (rpc.data && !rpc.error) return rpc.data;

  try {
    const res = await fetch("/api/crash/loop", {
      cache: "no-store",
      method: "GET",
    });
    if (res.ok) {
      const body = (await res.json()) as { state?: unknown };
      const fromApi = parseCrashState(body.state);
      if (fromApi) return fromApi;
    }
  } catch {
    /* réseau */
  }

  const table = await fetchCrashStateFromTable();
  return table.data;
}

/** @deprecated Utiliser runCrashLoopTick */
export async function advanceCrashFromClient(): Promise<CrashPublicState | null> {
  return runCrashLoopTick();
}
