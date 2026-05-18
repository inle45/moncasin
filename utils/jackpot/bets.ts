import {
  JACKPOT_COUNTDOWN_SECONDS,
  JACKPOT_ROLLING_MS,
} from "@/utils/jackpot/constants";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";

/** Parse ISO / timestamptz Postgres / epoch (s ou ms). Retourne null si invalide. */
export function parseJackpotTimestamp(
  value: string | null | undefined
): number | null {
  if (value == null || value === "") return null;

  const trimmed = String(value).trim();
  if (!trimmed) return null;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber;
    return Number.isFinite(ms) ? ms : null;
  }

  const ms = new Date(trimmed).getTime();
  return Number.isFinite(ms) ? ms : null;
}

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

  const startMs = parseJackpotTimestamp(round.started_at);
  if (startMs != null) {
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    return Math.max(0, JACKPOT_COUNTDOWN_SECONDS - elapsed);
  }
  if (round.started_at) {
    console.warn("[Jackpot] started_at invalide (NaN) — valeur brute:", round.started_at);
  }

  const endMs = parseJackpotTimestamp(round.counting_ends_at);
  if (endMs != null) {
    return Math.max(0, Math.ceil((endMs - Date.now()) / 1000));
  }
  if (round.counting_ends_at) {
    console.warn(
      "[Jackpot] counting_ends_at invalide (NaN) — valeur brute:",
      round.counting_ends_at
    );
  }

  const updatedMs = parseJackpotTimestamp(round.updated_at);
  if (updatedMs != null) {
    const elapsed = Math.floor((Date.now() - updatedMs) / 1000);
    const left = JACKPOT_COUNTDOWN_SECONDS - elapsed;
    console.warn(
      "[Jackpot] Chrono via updated_at (started_at / counting_ends_at manquants ou invalides)",
      { started_at: round.started_at, counting_ends_at: round.counting_ends_at, left }
    );
    return Math.max(0, left);
  }

  console.warn(
    "[Jackpot] Aucune date valide pour le chrono — forçage 0s pour tenter trigger_jackpot_roll",
    { id: round.id, started_at: round.started_at, counting_ends_at: round.counting_ends_at }
  );
  return 0;
}

/** Temps restant avant fin d'animation rolling (0 = prêt à clôturer). */
export function getRollingAnimationRemainingMs(
  round: JackpotRound | null
): number | null {
  if (!round || round.status !== "rolling") return null;

  const startedMs = parseJackpotTimestamp(round.rolling_started_at);
  if (startedMs == null) return JACKPOT_ROLLING_MS;

  return Math.max(0, JACKPOT_ROLLING_MS - (Date.now() - startedMs));
}

export function isCountdownExpired(
  round: JackpotRound | null,
  countdownSeconds: number | null
): boolean {
  if (!round || round.status !== "counting") return false;
  if (countdownSeconds == null) return false;
  return countdownSeconds <= 0;
}
