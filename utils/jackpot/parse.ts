import type { JackpotBetRow, JackpotRound, JackpotRoundStatus } from "./types";

const STATUSES: JackpotRoundStatus[] = [
  "waiting",
  "counting",
  "rolling",
  "ended",
];

export function parseJackpotRound(row: Record<string, unknown>): JackpotRound | null {
  const id = String(row.id ?? "");
  if (!id) return null;

  const status = String(row.status ?? "waiting") as JackpotRoundStatus;
  if (!STATUSES.includes(status)) return null;

  return {
    id,
    round_number: Number(row.round_number ?? 1),
    status,
    total_pot: Number(row.total_pot ?? 0),
    tax_pool: Number(row.tax_pool ?? 0),
    winner_id: row.winner_id ? String(row.winner_id) : null,
    winner_payout:
      row.winner_payout != null ? Number(row.winner_payout) : null,
    winning_ticket:
      row.winning_ticket != null ? Number(row.winning_ticket) : null,
    counting_ends_at: row.counting_ends_at
      ? String(row.counting_ends_at)
      : null,
    rolling_started_at: row.rolling_started_at
      ? String(row.rolling_started_at)
      : null,
    ended_at: row.ended_at ? String(row.ended_at) : null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function parseJackpotBet(row: Record<string, unknown>): JackpotBetRow | null {
  const id = String(row.id ?? "");
  if (!id) return null;

  return {
    id,
    round_id: String(row.round_id ?? ""),
    user_id: String(row.user_id ?? ""),
    username: String(row.username ?? "Joueur"),
    bet_amount: Number(row.bet_amount ?? 0),
    ticket_start: Number(row.ticket_start ?? 0),
    ticket_end: Number(row.ticket_end ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

export function parseJackpotTickPayload(data: unknown): {
  round: JackpotRound | null;
  serverNowMs: number | null;
} {
  if (!data || typeof data !== "object") {
    return { round: null, serverNowMs: null };
  }

  const obj = data as Record<string, unknown>;
  const roundRaw = obj.round;
  const round =
    roundRaw && typeof roundRaw === "object"
      ? parseJackpotRound(roundRaw as Record<string, unknown>)
      : null;

  let serverNowMs: number | null = null;
  if (obj.server_now) {
    const ms = new Date(String(obj.server_now)).getTime();
    if (Number.isFinite(ms)) serverNowMs = ms;
  }

  return { round, serverNowMs };
}
