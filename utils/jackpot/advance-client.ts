import {
  advanceJackpotTick,
  fetchActiveJackpotRound,
} from "@/utils/supabase/jackpot-room";
import type { JackpotRound } from "@/utils/jackpot/types";

export async function runJackpotLoopTick(): Promise<{
  round: JackpotRound | null;
  serverNowMs: number | null;
  errors: string[];
}> {
  const errors: string[] = [];
  let round: JackpotRound | null = null;
  let serverNowMs: number | null = null;

  const tick = await advanceJackpotTick();
  if (tick.error) errors.push(tick.error);
  if (tick.data) {
    round = tick.data;
    serverNowMs = tick.serverNowMs ?? null;
  }

  if (!round) {
    const fresh = await fetchActiveJackpotRound();
    if (fresh.error) errors.push(fresh.error);
    round = fresh.data;
  }

  return { round, serverNowMs, errors };
}
