import {
  parseJackpotBet,
  parseJackpotRpcPayload,
  parseJackpotRound,
  parseJackpotTickPayload,
} from "@/utils/jackpot/parse";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { createClient, safeQuery } from "./client";

export const JACKPOT_CHANNEL = "jackpot:arena";

type RpcResult<T> = { data: T | null; error: string | null };

/** Dernière manche (manche active ou récemment terminée). */
export async function fetchActiveJackpotRound(): Promise<
  RpcResult<JackpotRound>
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("jackpot_rounds")
      .select("*")
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

/** Avancement serveur optionnel (si la RPC existe encore). */
export async function advanceJackpotTick(): Promise<
  RpcResult<JackpotRound> & { serverNowMs?: number | null; skipped?: boolean }
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
    error: { message: string; code?: string } | null;
  };

  if (error) {
    const missing =
      error.message.includes("Could not find") ||
      error.message.includes("does not exist") ||
      error.code === "PGRST202";
    if (missing) {
      return { data: null, error: null, skipped: true };
    }
    return { data: null, error: error.message };
  }

  const parsed = parseJackpotTickPayload(data);
  return {
    data: parsed.round,
    error: null,
    serverNowMs: parsed.serverNowMs,
  };
}

/**
 * Entrée dans l'arène — RPC configurée côté Supabase.
 * Passe explicitement l'ID utilisateur et le montant.
 */
export async function enterJackpotArena(
  userId: string,
  amount: number
): Promise<{
  ok: boolean;
  balance?: number;
  bet?: JackpotBetRow;
  round?: JackpotRound;
  error: string | null;
}> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  const safeAmount = Math.floor(amount);
  if (!userId) return { ok: false, error: "Non authentifié" };
  if (safeAmount < 10) return { ok: false, error: "Mise minimum : 10 jetons" };

  const paramVariants: Record<string, string | number>[] = [
    { p_user_id: userId, p_amount: safeAmount },
    { p_user_id: userId, p_bet_amount: safeAmount },
    { user_id: userId, p_amount: safeAmount },
    { user_id: userId, amount: safeAmount },
  ];

  let lastError: string | null = null;

  for (const params of paramVariants) {
    const { data: response, timedOut } = await safeQuery(
      supabase.rpc(
        "enter_jackpot_arena",
        params as {
          p_user_id: string;
          p_amount: number;
          p_bet_amount?: number;
          user_id?: string;
          amount?: number;
        }
      )
    );

    if (timedOut || !response) {
      return { ok: false, error: "Connexion expirée" };
    }

    const { data, error } = response as {
      data: unknown;
      error: { message: string; code?: string } | null;
    };

    if (error) {
      lastError = error.message;
      const wrongParams =
        error.message.includes("Could not find") ||
        error.message.includes("function") ||
        error.code === "PGRST202";
      if (wrongParams) continue;
      return { ok: false, error: error.message };
    }

    const parsed = parseJackpotRpcPayload(data);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error ?? "Entrée refusée" };
    }

    return {
      ok: true,
      balance: parsed.balance ?? undefined,
      bet: parsed.bet ?? undefined,
      round: parsed.round ?? undefined,
      error: null,
    };
  }

  return {
    ok: false,
    error: lastError ?? "RPC enter_jackpot_arena introuvable",
  };
}

/** @deprecated Utiliser enterJackpotArena */
export async function placeJackpotBet(amount: number) {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié" };

  return enterJackpotArena(user.id, amount);
}
