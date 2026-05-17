"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JackpotTier } from "@/utils/slot/types";
import {
  type JackpotPools,
  JACKPOT_SEEDS,
  applyBetContribution,
  claimJackpotPool,
  fetchProgressiveJackpots,
  persistProgressiveJackpots,
} from "@/utils/supabase/jackpots";

export function useProgressiveJackpots() {
  const [pools, setPools] = useState<JackpotPools>({ ...JACKPOT_SEEDS });
  const [loading, setLoading] = useState(true);
  const poolsRef = useRef(pools);

  useEffect(() => {
    poolsRef.current = pools;
  }, [pools]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { pools: fetched, error } = await fetchProgressiveJackpots();
    if (fetched) setPools(fetched);
    if (error) console.warn("[Jackpots]", error);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const contribute = useCallback(async (bet: number) => {
    const next = applyBetContribution(poolsRef.current, bet);
    poolsRef.current = next;
    setPools(next);
    const { error } = await persistProgressiveJackpots(next);
    if (error) console.warn("[Jackpots] contribute:", error);
    return next;
  }, []);

  const claim = useCallback(async (tier: JackpotTier) => {
    const { payout, pools: next } = claimJackpotPool(poolsRef.current, tier);
    poolsRef.current = next;
    setPools(next);
    const { error } = await persistProgressiveJackpots(next);
    if (error) console.warn("[Jackpots] claim:", error);
    return payout;
  }, []);

  return {
    pools,
    loading,
    refresh,
    contribute,
    claim,
  };
}
