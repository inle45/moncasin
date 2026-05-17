import { createClient, safeQuery } from "./client";
import { isDemoMode } from "./config";
import type { JackpotTier } from "@/utils/slot/types";

export type JackpotPools = Record<JackpotTier, number>;

export const JACKPOT_SEEDS: JackpotPools = {
  mini: 5_000,
  minor: 25_000,
  major: 100_000,
  grand: 500_000,
};

/** Part de la mise ajoutée à chaque cagnotte (par tour payant). */
export const JACKPOT_CONTRIBUTION_RATE: Record<JackpotTier, number> = {
  mini: 0.012,
  minor: 0.008,
  major: 0.005,
  grand: 0.003,
};

const DEMO_POOLS_KEY = "moncasin_demo_jackpot_pools";

type PgError = { message: string };

function pgError(err: PgError | null | undefined, fallback: string): string | null {
  return err?.message ?? fallback;
}

export function loadDemoJackpotPools(): JackpotPools {
  if (typeof window === "undefined") return { ...JACKPOT_SEEDS };
  try {
    const raw = localStorage.getItem(DEMO_POOLS_KEY);
    if (!raw) return { ...JACKPOT_SEEDS };
    return { ...JACKPOT_SEEDS, ...JSON.parse(raw) } as JackpotPools;
  } catch {
    return { ...JACKPOT_SEEDS };
  }
}

export function saveDemoJackpotPools(pools: JackpotPools): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_POOLS_KEY, JSON.stringify(pools));
}

export function applyBetContribution(
  pools: JackpotPools,
  bet: number
): JackpotPools {
  const next = { ...pools };
  (Object.keys(JACKPOT_CONTRIBUTION_RATE) as JackpotTier[]).forEach((tier) => {
    next[tier] = Math.floor(
      next[tier] + bet * JACKPOT_CONTRIBUTION_RATE[tier]
    );
  });
  return next;
}

export function claimJackpotPool(
  pools: JackpotPools,
  tier: JackpotTier
): { payout: number; pools: JackpotPools } {
  const payout = pools[tier];
  return {
    payout,
    pools: { ...pools, [tier]: JACKPOT_SEEDS[tier] },
  };
}

export async function fetchProgressiveJackpots(): Promise<{
  pools: JackpotPools | null;
  error: string | null;
}> {
  if (isDemoMode()) {
    return { pools: loadDemoJackpotPools(), error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    return { pools: loadDemoJackpotPools(), error: null };
  }

  const { data: response, timedOut } = await safeQuery(
    supabase.from("progressive_jackpots").select("tier, amount")
  );

  if (timedOut || !response) {
    return { pools: null, error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { data, error } = response as {
    data: Array<{ tier: JackpotTier; amount: number }> | null;
    error: PgError | null;
  };

  if (error) {
    return { pools: null, error: pgError(error, "Jackpots indisponibles") };
  }

  const pools = { ...JACKPOT_SEEDS };
  for (const row of data ?? []) {
    pools[row.tier] = Number(row.amount);
  }

  return { pools, error: null };
}

export async function persistProgressiveJackpots(
  pools: JackpotPools
): Promise<{ error: string | null }> {
  if (isDemoMode()) {
    saveDemoJackpotPools(pools);
    return { error: null };
  }

  const supabase = createClient();
  if (!supabase) {
    saveDemoJackpotPools(pools);
    return { error: null };
  }

  const rows = (Object.keys(pools) as JackpotTier[]).map((tier) => ({
    tier,
    amount: Math.max(JACKPOT_SEEDS[tier], Math.floor(pools[tier])),
    updated_at: new Date().toISOString(),
  }));

  const { data: response, timedOut } = await safeQuery(
    supabase.from("progressive_jackpots").upsert(rows)
  );

  if (timedOut || !response) {
    return { error: timedOut ? "Connexion Supabase expirée" : null };
  }

  const { error } = response as { error: PgError | null };
  if (error) return { error: pgError(error, "Sync jackpots échouée") };

  return { error: null };
}
