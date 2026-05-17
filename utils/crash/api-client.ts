import type { CrashSnapshot } from "@/utils/crash/server-loop";

const LOOP_POLL_MS = 1000;

export { LOOP_POLL_MS };

export async function fetchCrashLoop(
  roundId?: string | null
): Promise<CrashSnapshot> {
  const params = new URLSearchParams();
  if (roundId) params.set("roundId", roundId);

  const qs = params.toString();
  const url = `/api/crash/loop${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return {
      state: null,
      history: [],
      bets: [],
      serverTime: Date.now(),
      error: body.error ?? `HTTP ${res.status}`,
    };
  }

  return (await res.json()) as CrashSnapshot;
}
