import { JACKPOT_COUNTDOWN_SECONDS } from "@/utils/jackpot/constants";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";

/** Une entrée par joueur (somme des mises si doublons). */
export function aggregateBetsByUser(bets: JackpotBetRow[]): JackpotBetRow[] {
  const map = new Map<string, JackpotBetRow>();

  for (const bet of bets) {
    const existing = map.get(bet.user_id);
    if (!existing) {
      map.set(bet.user_id, { ...bet });
      continue;
    }
    map.set(bet.user_id, {
      ...existing,
      bet_amount: existing.bet_amount + bet.bet_amount,
      ticket_start: Math.min(existing.ticket_start, bet.ticket_start),
      ticket_end: Math.max(existing.ticket_end, bet.ticket_end),
    });
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function computeCountdownSeconds(
  round: JackpotRound | null
): number | null {
  if (!round || round.status !== "counting") return null;

  if (round.started_at) {
    const startMs = new Date(round.started_at).getTime();
    if (Number.isFinite(startMs)) {
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      return Math.max(0, JACKPOT_COUNTDOWN_SECONDS - elapsed);
    }
  }

  if (round.counting_ends_at) {
    const endMs = new Date(round.counting_ends_at).getTime();
    if (Number.isFinite(endMs)) {
      return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
    }
  }

  return JACKPOT_COUNTDOWN_SECONDS;
}

export function isCountdownExpired(
  round: JackpotRound | null,
  countdownSeconds: number | null
): boolean {
  if (!round || round.status !== "counting") return false;
  if (countdownSeconds == null) return false;
  return countdownSeconds <= 0;
}
