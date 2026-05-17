import { parseCrashState } from "@/utils/crash/parse-state";
import { createClient, safeQuery } from "./client";
import type { CrashBetRow } from "@/utils/crash/types";

import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";

export const CRASH_CHANNEL = "crash:global";
export { CRASH_BETTING_SECONDS };

export async function placeCrashBet(
  amount: number
): Promise<{ ok: boolean; balance?: number; error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("crash_place_bet", { p_amount: amount })
  );

  if (timedOut || !response) {
    return { ok: false, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: { ok?: boolean; balance?: number } | null;
    error: { message: string } | null;
  };

  if (error) return { ok: false, error: error.message };
  return {
    ok: !!data?.ok,
    balance: data?.balance != null ? Number(data.balance) : undefined,
    error: null,
  };
}

export async function cashoutCrash(
  multiplier: number
): Promise<{
  ok: boolean;
  multiplier?: number;
  payout?: number;
  balance?: number;
  error: string | null;
}> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "Supabase non configuré" };

  const { data: response, timedOut } = await safeQuery(
    supabase.rpc("crash_cashout", { p_multiplier: multiplier })
  );

  if (timedOut || !response) {
    return { ok: false, error: "Connexion expirée" };
  }

  const { data, error } = response as {
    data: {
      ok?: boolean;
      multiplier?: number;
      payout?: number;
      balance?: number;
    } | null;
    error: { message: string } | null;
  };

  if (error) return { ok: false, error: error.message };

  return {
    ok: !!data?.ok,
    multiplier: data?.multiplier != null ? Number(data.multiplier) : undefined,
    payout: data?.payout != null ? Number(data.payout) : undefined,
    balance: data?.balance != null ? Number(data.balance) : undefined,
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
