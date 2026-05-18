import {
  parseJackpotBet,
  parseJackpotRpcPayload,
  parseJackpotRound,
  parseJackpotTickPayload,
} from "@/utils/jackpot/parse";
import { logJackpotRpc } from "@/utils/jackpot/rpc-debug";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { createClient, safeQuery } from "./client";

export const JACKPOT_CHANNEL = "jackpot:arena";

/** Colonne solde officielle MonCasin (profiles.balance, type bigint). */
export const PROFILE_BALANCE_COLUMN = "balance" as const;

type RpcResult<T> = { data: T | null; error: string | null };

export type EnterJackpotArenaResult = {
  ok: boolean;
  balance?: number;
  bet?: JackpotBetRow;
  round?: JackpotRound;
  error: string | null;
  /** Détail technique pour l'UI / la console */
  debug?: {
    step: string;
    postgrestCode?: string;
    postgrestMessage?: string;
    postgrestDetails?: string;
    postgrestHint?: string;
    rawData?: unknown;
    paramsUsed?: Record<string, unknown>;
  };
};

type PostgrestErrorShape = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

function formatPostgrestError(err: PostgrestErrorShape): string {
  const parts = [
    err.message,
    err.code ? `[${err.code}]` : "",
    err.details ? `Détails: ${err.details}` : "",
    err.hint ? `Hint: ${err.hint}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Dernière manche (manche active ou récemment terminée). */
export async function fetchActiveJackpotRound(): Promise<
  RpcResult<JackpotRound>
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut, error: timeoutErr } = await safeQuery(
    supabase
      .from("jackpot_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (timedOut) {
    return { data: null, error: "Connexion expirée (jackpot_rounds)" };
  }
  if (timeoutErr) {
    return { data: null, error: String(timeoutErr) };
  }
  if (!response) {
    return { data: null, error: "Aucune réponse jackpot_rounds" };
  }

  const { data, error } = response as {
    data: Record<string, unknown> | null;
    error: PostgrestErrorShape | null;
  };

  if (error) {
    logJackpotRpc("fetchActiveJackpotRound ERROR", { error });
    return { data: null, error: formatPostgrestError(error) };
  }
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
    return { bets: [], error: "Connexion expirée (jackpot_bets)" };
  }

  const { data, error } = response as {
    data: Record<string, unknown>[] | null;
    error: PostgrestErrorShape | null;
  };

  if (error) {
    logJackpotRpc("fetchJackpotBets ERROR", { roundId, error });
    return { bets: [], error: formatPostgrestError(error) };
  }

  const bets = (data ?? [])
    .map((row) => parseJackpotBet(row))
    .filter((b): b is JackpotBetRow => b != null);

  return { bets, error: null };
}

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
    error: PostgrestErrorShape | null;
  };

  if (error) {
    const missing =
      error.message.includes("Could not find") ||
      error.message.includes("does not exist") ||
      error.code === "PGRST202";
    if (missing) {
      return { data: null, error: null, skipped: true };
    }
    return { data: null, error: formatPostgrestError(error) };
  }

  const parsed = parseJackpotTickPayload(data);
  return {
    data: parsed.round,
    error: null,
    serverNowMs: parsed.serverNowMs,
  };
}

/**
 * Entrée dans l'arène via `enter_jackpot_arena(p_amount bigint)`.
 * L'utilisateur est identifié par `auth.uid()` côté SQL (pas de p_user_id requis).
 */
export async function enterJackpotArena(
  userId: string,
  amount: number
): Promise<EnterJackpotArenaResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase non configuré" };
  }

  const safeAmount = Math.floor(amount);
  if (!userId) return { ok: false, error: "Non authentifié (client)" };
  if (safeAmount < 10) return { ok: false, error: "Mise minimum : 10 jetons" };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const msg = authError?.message ?? "Session expirée — reconnecte-toi";
    logJackpotRpc("enter_jackpot_arena AUTH", { authError, userId });
    return { ok: false, error: msg, debug: { step: "auth", postgrestMessage: msg } };
  }

  if (user.id !== userId) {
    logJackpotRpc("enter_jackpot_arena UID MISMATCH", {
      sessionUser: user.id,
      passedUserId: userId,
    });
  }

  const paramAttempts: { label: string; params: { p_amount: number } }[] = [
    { label: "p_amount seul (officiel)", params: { p_amount: safeAmount } },
  ];

  let lastDebug: EnterJackpotArenaResult["debug"];

  for (const attempt of paramAttempts) {
    logJackpotRpc("enter_jackpot_arena REQUEST", {
      params: attempt.params,
      sessionUserId: user.id,
      profileBalanceColumn: PROFILE_BALANCE_COLUMN,
    });

    try {
      const rpcPromise = supabase.rpc("enter_jackpot_arena", attempt.params);
      const { data: wrapped, timedOut, error: timeoutErr } = await safeQuery(
        rpcPromise
      );

      if (timedOut || timeoutErr) {
        const msg = timedOut
          ? "Connexion expirée (RPC enter_jackpot_arena)"
          : String(timeoutErr);
        console.error("[MonCasin Jackpot] enter_jackpot_arena timeout:", timeoutErr);
        return {
          ok: false,
          error: msg,
          debug: { step: "timeout", postgrestMessage: msg, paramsUsed: attempt.params },
        };
      }

      if (!wrapped) {
        console.error("[MonCasin Jackpot] enter_jackpot_arena: réponse vide");
        return {
          ok: false,
          error: "Réponse RPC vide",
          debug: { step: "empty_wrap", paramsUsed: attempt.params },
        };
      }

      const { data: rawData, error: rpcError } = wrapped as {
        data: unknown;
        error: PostgrestErrorShape | null;
      };

      logJackpotRpc("enter_jackpot_arena RAW RESPONSE", {
        params: attempt.params,
        rawData,
        rpcError,
      });

      console.log("[MonCasin Jackpot] enter_jackpot_arena brut:", {
        data: rawData,
        error: rpcError,
      });

      if (rpcError) {
        const msg = formatPostgrestError(rpcError);
        console.error("[MonCasin Jackpot] enter_jackpot_arena PostgREST error:", rpcError);
        lastDebug = {
          step: "postgrest_error",
          postgrestCode: rpcError.code,
          postgrestMessage: rpcError.message,
          postgrestDetails: rpcError.details,
          postgrestHint: rpcError.hint,
          rawData,
          paramsUsed: attempt.params,
        };
        return { ok: false, error: msg, debug: lastDebug };
      }

      const parsed = parseJackpotRpcPayload(rawData);

      logJackpotRpc("enter_jackpot_arena PARSED", { parsed });

      if (!parsed.ok) {
        console.error("[MonCasin Jackpot] enter_jackpot_arena logique refusée:", parsed.error, rawData);
        return {
          ok: false,
          error: parsed.error ?? "Entrée refusée par le serveur",
          debug: {
            step: "rpc_ok_false",
            rawData,
            paramsUsed: attempt.params,
            postgrestMessage: parsed.error ?? undefined,
          },
        };
      }

      console.log("[MonCasin Jackpot] enter_jackpot_arena succès:", {
        balance: parsed.balance,
        roundId: parsed.round?.id,
        totalPot: parsed.round?.total_pot,
        betId: parsed.bet?.id,
      });

      return {
        ok: true,
        balance: parsed.balance ?? undefined,
        bet: parsed.bet ?? undefined,
        round: parsed.round ?? undefined,
        error: null,
        debug: { step: "success", rawData, paramsUsed: attempt.params },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[MonCasin Jackpot] enter_jackpot_arena exception:", err);
      return {
        ok: false,
        error: `Exception RPC: ${msg}`,
        debug: {
          step: "exception",
          postgrestMessage: msg,
          paramsUsed: attempt.params,
        },
      };
    }
  }

  return {
    ok: false,
    error: lastDebug?.postgrestMessage ?? "RPC enter_jackpot_arena échouée",
    debug: lastDebug,
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
