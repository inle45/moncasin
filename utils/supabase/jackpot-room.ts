import {
  parseJackpotBet,
  parseJackpotBetsList,
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

export type TriggerJackpotRollResult = {
  ok: boolean;
  balance?: number;
  round?: JackpotRound;
  bets?: JackpotBetRow[];
  /** Message SQL brut (`message` / `error` du jsonb). */
  sqlMessage?: string;
  error: string | null;
  debug?: EnterJackpotArenaResult["debug"];
};

export type EnterJackpotArenaResult = {
  ok: boolean;
  balance?: number;
  bet?: JackpotBetRow;
  bets?: JackpotBetRow[];
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

/** rolling en premier pour ne pas écraser l'animation par une autre manche en counting. */
const ACTIVE_ROUND_STATUSES = ["rolling", "counting", "waiting"] as const;

/** Manche en cours (aligné sur jackpot_active_round_id : counting > rolling > waiting). */
export async function fetchActiveJackpotRound(): Promise<
  RpcResult<JackpotRound>
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  for (const status of ACTIVE_ROUND_STATUSES) {
    const { data: response, timedOut, error: timeoutErr } = await safeQuery(
      supabase
        .from("jackpot_rounds")
        .select("*")
        .eq("status", status)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );

    if (timedOut) {
      return { data: null, error: "Connexion expirée (jackpot_rounds)" };
    }
    if (timeoutErr) {
      return { data: null, error: String(timeoutErr) };
    }
    if (!response) continue;

    const { data, error } = response as {
      data: Record<string, unknown> | null;
      error: PostgrestErrorShape | null;
    };

    if (error) {
      logJackpotRpc("fetchActiveJackpotRound ERROR", { status, error });
      return { data: null, error: formatPostgrestError(error) };
    }
    if (!data) continue;

    const round = parseJackpotRound(data);
    if (round) return { data: round, error: null };
  }

  const { data: fallbackRes, timedOut: fbTimeout } = await safeQuery(
    supabase
      .from("jackpot_rounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  if (fbTimeout || !fallbackRes) {
    return { data: null, error: "Aucune manche jackpot_rounds" };
  }

  const { data: fbData, error: fbError } = fallbackRes as {
    data: Record<string, unknown> | null;
    error: PostgrestErrorShape | null;
  };

  if (fbError) {
    return { data: null, error: formatPostgrestError(fbError) };
  }
  if (!fbData) return { data: null, error: null };

  const round = parseJackpotRound(fbData);
  return round ? { data: round, error: null } : { data: null, error: "État invalide" };
}

function parseBetsFromRows(rows: Record<string, unknown>[] | null): JackpotBetRow[] {
  return (rows ?? [])
    .map((row) => parseJackpotBet(row))
    .filter((b): b is JackpotBetRow => b != null);
}

export async function fetchJackpotBets(
  roundId: string
): Promise<{ bets: JackpotBetRow[]; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { bets: [], error: null };

  let lastError: string | null = null;

  const { data: embeddedRes, timedOut: embTimeout } = await safeQuery(
    supabase
      .from("jackpot_rounds")
      .select(
        "id, jackpot_bets ( id, round_id, user_id, username, bet_amount, ticket_start, ticket_end, created_at )"
      )
      .eq("id", roundId)
      .maybeSingle()
  );

  if (!embTimeout && embeddedRes) {
    const { data: embData, error: embError } = embeddedRes as {
      data: Record<string, unknown> | null;
      error: PostgrestErrorShape | null;
    };

    if (embError) {
      lastError = formatPostgrestError(embError);
      logJackpotRpc("fetchJackpotBets embed ERROR", { roundId, error: embError });
    } else if (embData) {
      const nested = embData.jackpot_bets;
      const embedded = Array.isArray(nested)
        ? parseBetsFromRows(nested as Record<string, unknown>[])
        : parseJackpotBetsList(nested);

      if (embedded.length > 0) {
        logJackpotRpc("fetchJackpotBets embed OK", {
          roundId,
          count: embedded.length,
        });
        return { bets: embedded, error: null };
      }
    }
  }

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("jackpot_bets")
      .select(
        "id, round_id, user_id, username, bet_amount, ticket_start, ticket_end, created_at"
      )
      .eq("round_id", roundId)
      .order("created_at", { ascending: true })
  );

  if (timedOut || !response) {
    return {
      bets: [],
      error: lastError ?? "Connexion expirée (jackpot_bets)",
    };
  }

  const { data, error } = response as {
    data: Record<string, unknown>[] | null;
    error: PostgrestErrorShape | null;
  };

  if (error) {
    const msg = formatPostgrestError(error);
    logJackpotRpc("fetchJackpotBets ERROR", { roundId, error });
    return { bets: [], error: msg };
  }

  const bets = parseBetsFromRows(data);

  if (bets.length === 0 && (data?.length ?? 0) > 0) {
    console.warn(
      "[MonCasin Jackpot] Lignes jackpot_bets reçues mais parse échoué — vérifie user_id / id",
      data
    );
  }

  logJackpotRpc("fetchJackpotBets direct", { roundId, count: bets.length });

  return { bets, error: bets.length === 0 ? lastError : null };
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
 * Lance le tirage quand le décompte est terminé (`trigger_jackpot_roll(p_round_id uuid)`).
 * Réponse attendue : `{ ok, round, balance? }`.
 */
export async function triggerJackpotRoll(
  roundId: string
): Promise<TriggerJackpotRollResult> {
  const supabase = createClient();
  if (!supabase) {
    return { ok: false, error: "Supabase non configuré" };
  }

  if (!roundId) {
    return {
      ok: false,
      error: "ID de manche manquant (p_round_id)",
      debug: { step: "missing_round_id" },
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const msg = authError?.message ?? "Session expirée — reconnecte-toi";
    logJackpotRpc("trigger_jackpot_roll AUTH", { authError });
    return { ok: false, error: msg, debug: { step: "auth", postgrestMessage: msg } };
  }

  const params = { p_round_id: roundId };

  logJackpotRpc("trigger_jackpot_roll REQUEST", {
    sessionUserId: user.id,
    params,
  });

  try {
    const { data: wrapped, timedOut, error: timeoutErr } = await safeQuery(
      supabase.rpc("trigger_jackpot_roll", params)
    );

    if (timedOut || timeoutErr) {
      console.error("ERREUR CRITIQUE JACKPOT:", { timedOut, timeoutErr });
      const msg = timedOut
        ? "Connexion expirée (RPC trigger_jackpot_roll)"
        : String(timeoutErr);
      return {
        ok: false,
        error: msg,
        debug: { step: "timeout", postgrestMessage: msg },
      };
    }

    if (!wrapped) {
      return {
        ok: false,
        error: "Réponse RPC vide",
        debug: { step: "empty_wrap" },
      };
    }

    const { data: rawData, error: rpcError } = wrapped as {
      data: unknown;
      error: PostgrestErrorShape | null;
    };

    logJackpotRpc("trigger_jackpot_roll RAW RESPONSE", { rawData, rpcError });

    if (rpcError) {
      console.error("ERREUR CRITIQUE JACKPOT:", rpcError);
      const msg = formatPostgrestError(rpcError);
      return {
        ok: false,
        error: msg,
        debug: {
          step: "postgrest_error",
          postgrestCode: rpcError.code,
          postgrestMessage: rpcError.message,
          postgrestDetails: rpcError.details,
          postgrestHint: rpcError.hint,
          rawData,
        },
      };
    }

    const parsed = parseJackpotRpcPayload(rawData);

    if (!parsed.ok) {
      const sqlMessage = parsed.error ?? "Tirage refusé par le serveur";
      console.error("ERREUR CRITIQUE JACKPOT:", {
        type: "rpc_ok_false",
        sqlMessage,
        rawData,
      });
      return {
        ok: false,
        error: sqlMessage,
        sqlMessage,
        debug: {
          step: "rpc_ok_false",
          rawData,
          postgrestMessage: sqlMessage,
        },
      };
    }

    if (!parsed.round) {
      const sqlMessage =
        "RPC ok:true mais aucune manche parsable — vérifie le champ round et status dans la réponse JSON.";
      console.error("ERREUR CRITIQUE JACKPOT:", { sqlMessage, rawData });
      return {
        ok: false,
        error: sqlMessage,
        sqlMessage,
        debug: { step: "missing_round", rawData, postgrestMessage: sqlMessage },
      };
    }

    return {
      ok: true,
      balance: parsed.balance ?? undefined,
      round: parsed.round,
      bets: parsed.bets.length > 0 ? parsed.bets : undefined,
      error: null,
      debug: { step: "success", rawData },
    };
  } catch (err) {
    console.error("ERREUR CRITIQUE JACKPOT:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Exception RPC: ${msg}`,
      debug: { step: "exception", postgrestMessage: msg },
    };
  }
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

      const rpcBets =
        parsed.bets.length > 0
          ? parsed.bets
          : parsed.bet
            ? [parsed.bet]
            : [];

      return {
        ok: true,
        balance: parsed.balance ?? undefined,
        bet: parsed.bet ?? undefined,
        bets: rpcBets.length > 0 ? rpcBets : undefined,
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
