import { parseJackpotBet, parseJackpotRound, parseJackpotTickPayload } from "@/utils/jackpot/parse";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { createClient, safeQuery } from "./client";

export const JACKPOT_CHANNEL = "jackpot:arena";

type RpcResult<T> = { data: T | null; error: string | null };

export async function fetchActiveJackpotRound(): Promise<
  RpcResult<JackpotRound>
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("jackpot_rounds")
      .select("*")
      .in("status", ["waiting", "counting", "rolling", "ended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (timedOut || !response) {
    return { data: null, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };

  const round = parseJackpotRound(data);
  return round ? { data: round, error: null } : { data: null, error: "État invalide" };
}

export async function fetchJackpotBets(
  roundId: string
): Promise<{ bets: JackpotBetRow[]; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { bets: [], error: null };

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("jackpot_bets")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true })
  );

  if (timedOut || !response) {
    return { bets: [], error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: Record<string, unknown>[] | null;
    error: { message: string } | null;
  };

  if (error) return { bets: [], error: error.message };

  const bets = (data ?? [])
    .map((row) => parseJackpotBet(row))
    .filter((b): b is JackpotBetRow => b != null);

  return { bets, error: null };
}

export async function advanceJackpotTick(): Promise<
  RpcResult<JackpotRound> & { serverNowMs?: number | null }
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("jackpot_advance_tick")
  );

  if (timedOut || !response) {
    return { data: null, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: unknown;
    error: { message: string } | null;
  };

  if (error) return { data: null, error: error.message };

  const parsed = parseJackpotTickPayload(data);
  return {
    data: parsed.round,
    error: parsed.round ? null : "Réponse invalide",
    serverNowMs: parsed.serverNowMs,
  };
}

export async function placeJackpotBet(amount: number): Promise<{
  ok: boolean;
  balance?: number;
  betId?: string;
  round?: JackpotRound;
  error: string | null;
}> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  const safeAmount = Math.floor(amount);
  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("jackpot_place_bet", { p_amount: safeAmount })
  );

  if (timedOut || !response) {
    return { ok: false, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Réponse vide" };

  if (data.ok === false) {
    return { ok: false, error: String(data.error ?? "Mise refusée") };
  }

  const roundRaw = data.round;
  const round =
    roundRaw && typeof roundRaw === "object"
      ? parseJackpotRound(roundRaw as Record<string, unknown>)
      : undefined;

  return {
    ok: true,
    balance: data.balance != null ? Number(data.balance) : undefined,
    betId: data.bet_id ? String(data.bet_id) : undefined,
    round: round ?? undefined,
    error: null,
  };
}

export async function fetchJackpotTaxPool(): Promise<number> {
  const supabase = createClient();
  if (!supabase) return 0;

  const { data: response } = await safeQuery(
    supabase.from("jackpot_meta").select("tax_pool").eq("id", 1).maybeSingle()
  );

  if (!response?.data) return 0;
  const { data } = response as { data: { tax_pool: number } | null };
  return Number(data?.tax_pool ?? 0);
}
