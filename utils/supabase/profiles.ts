import { createClient, safeQuery } from "./client";
import { isDemoMode } from "./config";
import { withTimeout } from "./timeout";
import type { Profile } from "./database.types";

export interface LeaderboardPlayer {
  id: string;
  username: string;
  balance: number;
  vip_status: string;
  rank: number;
}

const LEADERBOARD_SELECT = "id, username, balance, vip_status" as const;
const DB_TIMEOUT_MS = 5000;

type PostgrestError = { message: string };

function pgError(
  err: PostgrestError | null | undefined,
  fallback: string
): string | null {
  return err?.message ?? fallback;
}

export async function fetchProfile(userId: string): Promise<{
  profile: Profile | null;
  error: string | null;
}> {
  if (isDemoMode()) {
    return { profile: null, error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { profile: null, error: null };
  }

  const { data: response, timedOut } = await safeQuery(
    supabase.from("profiles").select("*").eq("id", userId).single()
  );

  if (timedOut || !response) {
    return { profile: null, error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { data, error } = response as { data: Profile | null; error: PostgrestError | null };

  if (error || !data) {
    return { profile: null, error: pgError(error, "Profil introuvable") };
  }

  return { profile: data, error: null };
}

export async function updateProfileBalance(
  userId: string,
  balance: number
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    return { error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: null };
  }

  const safeBalance = Math.max(0, Math.floor(balance));

  const { data: response, timedOut } = await safeQuery(
    supabase.from("profiles").update({ balance: safeBalance }).eq("id", userId)
  );

  if (timedOut || !response) {
    return { error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { error } = response as { error: PostgrestError | null };

  if (error) {
    return { error: pgError(error, "Mise à jour échouée") };
  }

  return { error: null };
}

export async function updateProfileShopState(
  userId: string,
  updates: { balance: number; vip_status?: string }
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    return { error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { error: null };
  }

  const payload: { balance: number; vip_status?: string } = {
    balance: Math.max(0, Math.floor(updates.balance)),
  };

  if (updates.vip_status) {
    payload.vip_status = updates.vip_status;
  }

  const { data: response, timedOut } = await safeQuery(
    supabase.from("profiles").update(payload).eq("id", userId)
  );

  if (timedOut || !response) {
    return { error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { error } = response as { error: PostgrestError | null };

  if (error) {
    return { error: pgError(error, "Achat échoué") };
  }

  return { error: null };
}

export async function fetchLeaderboardTop100(): Promise<{
  players: LeaderboardPlayer[];
  error: string | null;
}> {
  if (isDemoMode()) {
    return { players: [], error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { players: [], error: null };
  }

  const { data: response, timedOut } = await safeQuery(
    supabase
      .from("profiles")
      .select(LEADERBOARD_SELECT)
      .order("balance", { ascending: false })
      .limit(100)
  );

  if (timedOut || !response) {
    return { players: [], error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { data, error } = response as {
    data: Array<{
      id: string;
      username: string | null;
      balance: number;
      vip_status: string;
    }> | null;
    error: PostgrestError | null;
  };

  if (error) {
    return { players: [], error: pgError(error, "Classement indisponible") };
  }

  const players: LeaderboardPlayer[] = (data ?? []).map((row, index) => ({
    id: row.id,
    username: row.username ?? "Joueur",
    balance: Number(row.balance),
    vip_status: row.vip_status,
    rank: index + 1,
  }));

  return { players, error: null };
}

export async function fetchPlayerRank(userId: string): Promise<{
  rank: number | null;
  profile: Profile | null;
  error: string | null;
}> {
  if (isDemoMode()) {
    return { rank: null, profile: null, error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { rank: null, profile: null, error: null };
  }

  const profileResult = await safeQuery(
    supabase.from("profiles").select("*").eq("id", userId).single()
  );

  if (profileResult.timedOut || !profileResult.data) {
    return {
      rank: null,
      profile: null,
      error: profileResult.timedOut ? "Connexion Supabase expirée" : "Profil introuvable",
    };
  }

  const { data: profile, error: profileError } = profileResult.data as {
    data: Profile | null;
    error: PostgrestError | null;
  };

  if (profileError || !profile) {
    return {
      rank: null,
      profile: null,
      error: pgError(profileError, "Profil introuvable"),
    };
  }

  try {
    const { count, error: countError } = await withTimeout(
      Promise.resolve(
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gt("balance", profile.balance)
      ),
      DB_TIMEOUT_MS,
      "profiles.count"
    );

    if (countError) {
      return { rank: null, profile, error: countError.message };
    }

    return { rank: (count ?? 0) + 1, profile, error: null };
  } catch {
    return { rank: null, profile, error: "Connexion Supabase expirée" };
  }
}
