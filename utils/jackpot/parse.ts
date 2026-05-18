import { isRpcOk, unwrapRpcJson } from "@/utils/jackpot/unwrap-rpc";
import type { JackpotBetRow, JackpotRound, JackpotRoundStatus } from "./types";

const STATUSES: JackpotRoundStatus[] = [
  "waiting",
  "counting",
  "rolling",
  "ended",
];

const STATUS_ALIASES: Record<string, JackpotRoundStatus> = {
  waiting: "waiting",
  counting: "counting",
  countdown: "counting",
  rolling: "rolling",
  roll: "rolling",
  ended: "ended",
  finished: "ended",
  complete: "ended",
};

/** Message d'échec renvoyé par les RPC SQL (`{ ok: false, message: '...' }`). */
export function extractJackpotRpcErrorMessage(
  obj: Record<string, unknown>
): string {
  const parts: string[] = [];
  for (const key of [
    "message",
    "error",
    "msg",
    "reason",
    "detail",
    "details",
    "hint",
  ]) {
    const v = obj[key];
    if (v != null && String(v).trim() !== "") {
      parts.push(String(v).trim());
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "Action refusée par le serveur";
}

function normalizeRoundStatus(raw: unknown): JackpotRoundStatus | null {
  const key = String(raw ?? "waiting")
    .trim()
    .toLowerCase();
  const mapped = STATUS_ALIASES[key];
  if (mapped) return mapped;
  if (STATUSES.includes(key as JackpotRoundStatus)) {
    return key as JackpotRoundStatus;
  }
  return null;
}

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

  const status = normalizeRoundStatus(row.status);
  if (!status) {
    console.warn("[Jackpot] Statut round inconnu:", row.status, row);
    return null;
  }

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
    started_at: pickString(row, "started_at", "counting_started_at"),
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
  const userId = pickString(row, "user_id", "player_id", "uid");
  const roundId = pickString(row, "round_id", "jackpot_round_id", "roundId");
  if (!userId) return null;

  const id =
    pickString(row, "id", "bet_id") ??
    `${roundId ?? "round"}-${userId}`;

  return {
    id,
    round_id: roundId ?? "",
    user_id: userId,
    username: String(row.username ?? row.player_name ?? "Joueur"),
    bet_amount: pickNumber(row, "bet_amount", "amount", "stake", "wager"),
    ticket_start: pickNumber(row, "ticket_start", "tickets_start", "ticket_from"),
    ticket_end: pickNumber(row, "ticket_end", "tickets_end", "ticket_to"),
    created_at: String(row.created_at ?? row.inserted_at ?? ""),
  };
}

export function parseJackpotBetsList(source: unknown): JackpotBetRow[] {
  if (source == null) return [];
  if (Array.isArray(source)) {
    return source
      .map((row) =>
        typeof row === "object" && row
          ? parseJackpotBet(row as Record<string, unknown>)
          : null
      )
      .filter((b): b is JackpotBetRow => b != null);
  }
  if (typeof source !== "object") return [];

  const obj = source as Record<string, unknown>;
  const raw =
    obj.bets ??
    obj.jackpot_bets ??
    obj.players ??
    obj.gladiators;

  return Array.isArray(raw) ? parseJackpotBetsList(raw) : [];
}

export function parseJackpotRpcPayload(data: unknown): {
  ok: boolean;
  error: string | null;
  balance: number | null;
  round: JackpotRound | null;
  bet: JackpotBetRow | null;
  bets: JackpotBetRow[];
} {
  const unwrapped = unwrapRpcJson(data);
  if (unwrapped == null) {
    return {
      ok: false,
      error: "Réponse vide",
      balance: null,
      round: null,
      bet: null,
      bets: [],
    };
  }

  if (typeof unwrapped === "object" && "ok" in (unwrapped as object)) {
    const obj = unwrapped as Record<string, unknown>;
    if (!isRpcOk(obj.ok)) {
      return {
        ok: false,
        error: extractJackpotRpcErrorMessage(obj),
        balance: null,
        round: null,
        bet: null,
        bets: [],
      };
    }

    const roundRaw = obj.round ?? obj.jackpot_round;
    const betRaw = obj.bet ?? obj.jackpot_bet;
    const bets = parseJackpotBetsList(obj);

    const round =
      roundRaw && typeof roundRaw === "object"
        ? parseJackpotRound(roundRaw as Record<string, unknown>)
        : null;

    if (roundRaw && !round) {
      const rawStatus =
        typeof roundRaw === "object" && roundRaw && "status" in roundRaw
          ? String((roundRaw as Record<string, unknown>).status)
          : "?";
      return {
        ok: false,
        error: `Manche renvoyée mais statut illisible pour l'UI (« ${rawStatus} »). Attendu: waiting | counting | rolling | ended. Colonnes utiles: winner_id, winning_ticket, rolling_started_at, ended_at.`,
        balance: null,
        round: null,
        bet: null,
        bets: [],
      };
    }

    return {
      ok: true,
      error: null,
      balance: obj.balance != null ? Number(obj.balance) : null,
      round,
      bet:
        betRaw && typeof betRaw === "object"
          ? parseJackpotBet(betRaw as Record<string, unknown>)
          : null,
      bets,
    };
  }

  if (typeof unwrapped === "object") {
    const asRound = parseJackpotRound(unwrapped as Record<string, unknown>);
    if (asRound) {
      return {
        ok: true,
        error: null,
        balance: null,
        round: asRound,
        bet: null,
        bets: parseJackpotBetsList(unwrapped),
      };
    }
  }

  return {
    ok: false,
    error: "Réponse RPC invalide",
    balance: null,
    round: null,
    bet: null,
    bets: [],
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
