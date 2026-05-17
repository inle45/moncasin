import type { CrashSnapshot } from "@/utils/crash/server-loop";
import { createFallbackCrashState } from "@/utils/crash/default-state";

export const LOOP_POLL_MS = 800;

export async function fetchCrashLoop(
  roundId?: string | null
): Promise<CrashSnapshot> {
  const params = new URLSearchParams();
  if (roundId) params.set("roundId", roundId);

  const qs = params.toString();
  const url = `/api/crash/loop${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    const json = (await res.json()) as CrashSnapshot & { error?: string };

    if (json.state) {
      return {
        state: json.state,
        history: json.history ?? [],
        bets: json.bets ?? [],
        serverTime: json.serverTime ?? Date.now(),
        error: json.error ?? null,
        source: json.source ?? "supabase",
      };
    }

    return {
      state: createFallbackCrashState(),
      history: [],
      bets: [],
      serverTime: Date.now(),
      error: json.error ?? `HTTP ${res.status}`,
      source: "fallback",
    };
  } catch (err) {
    return {
      state: createFallbackCrashState(),
      history: [],
      bets: [],
      serverTime: Date.now(),
      error: err instanceof Error ? err.message : "Réseau",
      source: "fallback",
    };
  }
}
