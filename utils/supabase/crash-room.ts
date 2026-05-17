import { liveStateRowToPublic } from "@/utils/crash/live-state";
import { parseCrashState } from "@/utils/crash/parse-state";
import { createClient, safeQuery } from "./client";
import type { CrashBetRow, CrashPublicState } from "@/utils/crash/types";

import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";

export const CRASH_CHANNEL = "crash:global";
export { CRASH_BETTING_SECONDS };

type RpcResult<T> = { data: T | null; error: string | null };

/** Lecture directe de la table (fiable si le cache RPC PostgREST est en retard). */
export async function fetchCrashStateFromTable(): Promise<
  RpcResult<CrashPublicState>
> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase.from("crash_live_state").select("*").eq("id", 1).maybeSingle()
  );

  if (timedOut || !response) {
    return { data: null, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: Record<string, unknown> | null;
    error: { message: string } | null;
  };

  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: "Room crash introuvable (id=1)" };

  const state = liveStateRowToPublic(data);
  return state ? { data: state, error: null } : { data: null, error: "État invalide" };
}

export async function fetchCrashState(): Promise<RpcResult<CrashPublicState>> {
  const fromTable = await fetchCrashStateFromTable();
  if (fromTable.data) return fromTable;

  const supabase = createClient();
  if (!supabase) return fromTable;

  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("crash_get_state")
  );

  if (timedOut || !response) {
    return { data: null, error: fromTable.error ?? "Connexion expirée" };
  }

  const { data, error } = response as {
    data: unknown;
    error: { message: string } | null;
  };
  if (error) return { data: null, error: error.message };

  const state = parseCrashState(data);
  return state ? { data: state, error: null } : fromTable;
}

export async function advanceCrashTick(): Promise<RpcResult<CrashPublicState>> {
  const supabase = createClient();
  if (!supabase) return { data: null, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("crash_advance_tick")
  );

  if (timedOut || !response) {
    return { data: null, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: unknown;
    error: { message: string } | null;
  };
  if (error) {
    const fallback = await fetchCrashStateFromTable();
    if (fallback.data) return fallback;
    return { data: null, error: error.message };
  }

  const parsed = parseCrashState(data);
  if (parsed) return { data: parsed, error: null };

  return fetchCrashStateFromTable();
}

/** Sync client de secours si /api/crash/loop échoue. */
export async function syncCrashFromClient(
  maxSteps = 8
): Promise<RpcResult<CrashPublicState>> {
  let lastError: string | null = null;

  for (let i = 0; i < maxSteps; i++) {
    const { data, error } = await advanceCrashTick();
    if (error) {
      lastError = error;
      break;
    }
    if (data) {
      const { data: fresh, error: getErr } = await fetchCrashState();
      if (fresh && !getErr) return { data: fresh, error: null };
      return { data, error: null };
    }
  }

  const { data, error } = await fetchCrashState();
  if (data) return { data, error: null };
  return { data: null, error: lastError ?? error ?? "Sync impossible" };
}

/** Mise via INSERT crash_bets + UPDATE profiles (sans RPC). */
export async function placeCrashBet(
  amount: number,
  roundId: string
): Promise<{ ok: boolean; balance?: number; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  if (!roundId) return { ok: false, error: "Manche non synchronisée" };

  const safeAmount = Math.floor(amount);
  if (safeAmount <= 0) return { ok: false, error: "Mise invalide" };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Non authentifié" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance, username")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: profileError?.message ?? "Profil introuvable" };
  }

  const currentBalance = Math.floor(Number(profile.balance));
  if (currentBalance < safeAmount) {
    return { ok: false, error: "Solde insuffisant" };
  }

  const newBalance = currentBalance - safeAmount;

  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", user.id);

  if (balanceError) {
    return { ok: false, error: balanceError.message };
  }

  const { error: betError } = await supabase.from("crash_bets").insert({
    round_id: roundId,
    user_id: user.id,
    username: profile.username?.trim() || "Joueur",
    bet_amount: safeAmount,
    status: "active",
  });

  if (betError) {
    await supabase
      .from("profiles")
      .update({ balance: currentBalance })
      .eq("id", user.id);
    return { ok: false, error: betError.message };
  }

  return { ok: true, balance: newBalance, error: null };
}

/** Cashout via UPDATE crash_bets + profiles (sans RPC). */
export async function cashoutCrash(
  multiplier: number,
  roundId: string
): Promise<{
  ok: boolean;
  multiplier?: number;
  payout?: number;
  balance?: number;
  error: string | null;
}> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  if (!roundId) return { ok: false, error: "Manche non synchronisée" };

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false, error: "Non authentifié" };
  }

  const { data: activeBet, error: betError } = await supabase
    .from("crash_bets")
    .select("id, bet_amount")
    .eq("round_id", roundId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (betError) return { ok: false, error: betError.message };
  if (!activeBet) return { ok: false, error: "Aucune mise active" };

  const finalMult = Math.max(1, Math.floor(multiplier * 100) / 100);
  const payout = Math.floor(Number(activeBet.bet_amount) * finalMult);

  const { error: cashoutError } = await supabase
    .from("crash_bets")
    .update({
      status: "cashed_out",
      cashout_multiplier: finalMult,
      payout,
    })
    .eq("id", activeBet.id)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (cashoutError) return { ok: false, error: cashoutError.message };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, error: profileError?.message ?? "Profil introuvable" };
  }

  const newBalance = Math.floor(Number(profile.balance)) + payout;

  const { error: balanceError } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", user.id);

  if (balanceError) return { ok: false, error: balanceError.message };

  return {
    ok: true,
    multiplier: finalMult,
    payout,
    balance: newBalance,
    error: null,
  };
}

export async function fetchRoundBets(
  roundId: string
): Promise<{ bets: CrashBetRow[]; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { bets: [], error: null };

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("crash_bets")
      .select("*")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true })
  );

  if (timedOut || !response) {
    return { bets: [], error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: CrashBetRow[] | null;
    error: { message: string } | null;
  };

  if (error) return { bets: [], error: error.message };
  return { bets: (data ?? []) as CrashBetRow[], error: null };
}

export async function fetchCrashHistory(
  limit = 12
): Promise<{ points: number[]; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { points: [], error: null };

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("crash_round_history")
      .select("crash_point")
      .order("id", { ascending: false })
      .limit(limit)
  );

  if (timedOut || !response) return { points: [], error: null };

  const { data, error } = response as {
    data: Array<{ crash_point: number }> | null;
    error: { message: string } | null;
  };

  if (error) return { points: [], error: error.message };
  return {
    points: (data ?? []).map((r) => Number(r.crash_point)),
    error: null,
  };
}
