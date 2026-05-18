import { JACKPOT_SEGMENT_COLORS } from "@/utils/jackpot/constants";
import type { JackpotBetRow, JackpotPotSegment } from "@/utils/jackpot/types";

export function buildPotSegments(
  bets: JackpotBetRow[],
  totalPot: number
): JackpotPotSegment[] {
  if (!bets.length || totalPot <= 0) return [];

  return bets.map((bet, index) => ({
    userId: bet.user_id,
    username: bet.username,
    betAmount: bet.bet_amount,
    ticketStart: bet.ticket_start,
    ticketEnd: bet.ticket_end,
    percent: Math.round((bet.bet_amount / totalPot) * 1000) / 10,
    color: JACKPOT_SEGMENT_COLORS[index % JACKPOT_SEGMENT_COLORS.length],
  }));
}

export function totalTicketsFromBets(bets: JackpotBetRow[]): number {
  if (!bets.length) return 0;
  return Math.max(...bets.map((b) => b.ticket_end)) + 1;
}
