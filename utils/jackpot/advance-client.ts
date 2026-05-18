import {
  advanceJackpotTick,
  fetchActiveJackpotRound,
  fetchJackpotBets,
} from "@/utils/supabase/jackpot-room";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";

export async function runJackpotLoopTick(): Promise<{
  round: JackpotRound | null;
  bets: JackpotBetRow[];
  serverNowMs: number | null;
  errors: string[];
}> {
  const errors: string[] = [];

  const tick = await advanceJackpotTick();
  if (tick.error) errors.push(tick.error);

  let round = tick.data;
  if (!round) {
    const fresh = await fetchActiveJackpotRound();
    if (fresh.error) errors.push(fresh.error);
    round = fresh.data;
  }

  const bets: JackpotBetRow[] = [];
  if (round?.id) {
    const { bets: rows, error } = await fetchJackpotBets(round.id);
    if (error) errors.push(error);
    bets.push(...rows);
  }

  return {
    round,
    bets,
    serverNowMs: tick.serverNowMs ?? null,
    errors,
  };
}
