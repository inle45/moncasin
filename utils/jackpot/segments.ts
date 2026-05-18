import { aggregateBetsByUser } from "@/utils/jackpot/bets";
import { JACKPOT_SEGMENT_COLORS } from "@/utils/jackpot/constants";
import type { JackpotBetRow, JackpotPotSegment } from "@/utils/jackpot/types";

export function buildPotSegments(
  bets: JackpotBetRow[],
  totalPot: number
): JackpotPotSegment[] {
  const players = aggregateBetsByUser(bets);
  const pot = totalPot > 0 ? totalPot : players.reduce((s, b) => s + b.bet_amount, 0);
  if (!players.length || pot <= 0) return [];

  return players.map((bet, index) => ({
    userId: bet.user_id,
    username: bet.username,
    betAmount: bet.bet_amount,
    ticketStart: bet.ticket_start,
    ticketEnd: bet.ticket_end,
    percent: Math.round((bet.bet_amount / pot) * 1000) / 10,
    color: JACKPOT_SEGMENT_COLORS[index % JACKPOT_SEGMENT_COLORS.length],
  }));
}

export function totalTicketsFromBets(bets: JackpotBetRow[]): number {
  if (!bets.length) return 0;
  return Math.max(...bets.map((b) => b.ticket_end)) + 1;
}
