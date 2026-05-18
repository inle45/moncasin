import { isRpcOk, unwrapRpcJson } from "@/utils/jackpot/unwrap-rpc";
import type { JackpotBetRow, JackpotRound, JackpotRoundStatus } from "./types";

const STATUSES: JackpotRoundStatus[] = [
  "waiting",
  "counting",
  "rolling",
  "ended",
];

function pickString(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "") return String(v);
  }
  return null;
}

function pickNumber(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = row[key];
    if (v != null && v !== "") return Number(v);
  }
  return 0;
}

export function parseJackpotRound(row: Record<string, unknown>): JackpotRound | null {
  const id = String(row.id ?? "");
  if (!id) return null;

  const status = String(row.status ?? "waiting") as JackpotRoundStatus;
  if (!STATUSES.includes(status)) return null;

  return {
    id,
    round_number: pickNumber(row, "round_number"),
    status,
    total_pot: pickNumber(row, "total_pot", "pot_total"),
    tax_pool: pickNumber(row, "tax_pool"),
    winner_id: pickString(row, "winner_id"),
    winner_payout:
      row.winner_payout != null || row.payout != null
        ? pickNumber(row, "winner_payout", "payout")
        : null,
    winning_ticket:
      row.winning_ticket != null ? Number(row.winning_ticket) : null,
    counting_ends_at: pickString(
      row,
      "counting_ends_at",
      "countdown_ends_at",
      "ends_at"
    ),
    rolling_started_at: pickString(row, "rolling_started_at"),
    ended_at: pickString(row, "ended_at"),
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
    bet_amount: pickNumber(row, "bet_amount", "amount"),
    ticket_start: pickNumber(row, "ticket_start"),
    ticket_end: pickNumber(row, "ticket_end"),
    created_at: String(row.created_at ?? ""),
  };
}

export function parseJackpotRpcPayload(data: unknown): {
  ok: boolean;
  error: string | null;
  balance: number | null;
  round: JackpotRound | null;
  bet: JackpotBetRow | null;
} {
  const unwrapped = unwrapRpcJson(data);
  if (unwrapped == null) {
    return { ok: false, error: "Réponse vide", balance: null, round: null, bet: null };
  }

  if (typeof unwrapped === "object" && "ok" in (unwrapped as object)) {
    const obj = unwrapped as Record<string, unknown>;
    if (!isRpcOk(obj.ok)) {
      return {
        ok: false,
        error: String(obj.error ?? obj.message ?? "Action refusée"),
        balance: null,
        round: null,
        bet: null,
      };
    }

    const roundRaw = obj.round ?? obj.jackpot_round;
    const betRaw = obj.bet ?? obj.jackpot_bet;

    return {
      ok: true,
      error: null,
      balance: obj.balance != null ? Number(obj.balance) : null,
      round:
        roundRaw && typeof roundRaw === "object"
          ? parseJackpotRound(roundRaw as Record<string, unknown>)
          : null,
      bet:
        betRaw && typeof betRaw === "object"
          ? parseJackpotBet(betRaw as Record<string, unknown>)
          : null,
    };
  }

  if (typeof unwrapped === "object") {
    const asRound = parseJackpotRound(unwrapped as Record<string, unknown>);
    if (asRound) {
      return { ok: true, error: null, balance: null, round: asRound, bet: null };
    }
  }

  return { ok: false, error: "Réponse RPC invalide", balance: null, round: null, bet: null };
}

export function parseJackpotTickPayload(data: unknown): {
  round: JackpotRound | null;
  serverNowMs: number | null;
} {
  if (!data || typeof data !== "object") {
    return { round: null, serverNowMs: null };
  }

  const obj = data as Record<string, unknown>;
  const roundRaw = obj.round ?? obj.jackpot_round;
  const round =
    roundRaw && typeof roundRaw === "object"
      ? parseJackpotRound(roundRaw as Record<string, unknown>)
      : parseJackpotRound(obj);

  let serverNowMs: number | null = null;
  if (obj.server_now) {
    const ms = new Date(String(obj.server_now)).getTime();
    if (Number.isFinite(ms)) serverNowMs = ms;
  }

  return { round, serverNowMs };
}
