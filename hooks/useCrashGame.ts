"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import {
  CRASH_BET_OPTIONS,
  CRASH_HISTORY_SIZE,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import {
  calculateCashoutPayout,
  formatMultiplier,
  generateCrashPoint,
  multiplierAtElapsedMs,
} from "@/utils/crash/engine";
import { DEMO_MODE, safeGetUser } from "@/utils/supabase/client";
import { fetchProfile, updateProfileBalance } from "@/utils/supabase/profiles";
import { useCrashSounds } from "@/hooks/useCrashSounds";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";

export type CrashPhase = "idle" | "flying" | "cashed_out" | "crashed";

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

function saveDemoBalance(balance: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_BALANCE_KEY, String(balance));
}

export function useCrashGame() {
  const demo = DEMO_MODE;
  const sounds = useCrashSounds();

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [phase, setPhase] = useState<CrashPhase>("idle");
  const [multiplier, setMultiplier] = useState(1);
  const [activeBet, setActiveBet] = useState(0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);

  const [profileLoading, setProfileLoading] = useState(!demo);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(demo);

  const balanceRef = useRef(INITIAL_BALANCE);
  const userIdRef = useRef<string | null>(null);
  const crashPointRef = useRef(1.01);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const phaseRef = useRef<CrashPhase>("idle");
  const cashedOutRef = useRef(false);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const loadProfile = useCallback(async (userId: string) => {
    const { profile, error } = await fetchProfile(userId);
    if (profile) {
      setBalance(Number(profile.balance));
      balanceRef.current = Number(profile.balance);
      setProfileError(null);
      setIsDemoMode(false);
    } else {
      setBalance(loadDemoBalance());
      balanceRef.current = loadDemoBalance();
      setIsDemoMode(true);
      if (error) setProfileError(error);
    }
  }, []);

  useEffect(() => {
    if (demo) {
      const b = loadDemoBalance();
      setBalance(b);
      balanceRef.current = b;
      setProfileLoading(false);
      setIsDemoMode(true);
      return;
    }

    let mounted = true;

    (async () => {
      setProfileLoading(true);
      const { user } = await safeGetUser();
      if (!mounted) return;

      if (!user) {
        const b = loadDemoBalance();
        setBalance(b);
        balanceRef.current = b;
        setIsDemoMode(true);
        setProfileLoading(false);
        return;
      }

      userIdRef.current = user.id;
      await loadProfile(user.id);
      if (mounted) setProfileLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [demo, loadProfile]);

  const persistBalance = useCallback(
    async (newBalance: number) => {
      if (isDemoMode || !userIdRef.current) {
        saveDemoBalance(newBalance);
        return true;
      }

      setIsSyncing(true);
      const { error } = await updateProfileBalance(
        userIdRef.current,
        newBalance
      );
      setIsSyncing(false);

      if (error) {
        setProfileError(`Synchronisation échouée : ${error}`);
        return false;
      }
      setProfileError(null);
      return true;
    },
    [isDemoMode]
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const endRound = useCallback(
    (nextPhase: "crashed" | "cashed_out", crashValue: number) => {
      stopLoop();
      setCrashPoint(crashValue);
      setCrashHistory((h) =>
        [crashValue, ...h].slice(0, CRASH_HISTORY_SIZE)
      );
      setPhase(nextPhase);
      phaseRef.current = nextPhase;

      setTimeout(() => {
        setPhase("idle");
        phaseRef.current = "idle";
        setMultiplier(1);
        setActiveBet(0);
        setCrashPoint(null);
        setCurvePoints([1]);
        cashedOutRef.current = false;
      }, 2800);
    },
    [stopLoop]
  );

  const tick = useCallback(() => {
    if (phaseRef.current !== "flying" || cashedOutRef.current) return;

    const elapsed = performance.now() - startTimeRef.current;
    const current = multiplierAtElapsedMs(elapsed);

    setMultiplier(current);
    setCurvePoints((pts) => {
      const next = [...pts, current];
      return next.length > 80 ? next.slice(-80) : next;
    });

    if (current >= crashPointRef.current) {
      sounds.playCrash();
      setMessage(`Crash à ${formatMultiplier(crashPointRef.current)} !`);
      endRound("crashed", crashPointRef.current);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [endRound, sounds]);

  const placeBet = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    if (profileLoading || isSyncing) return;
    if (balanceRef.current < bet) {
      setMessage("Solde insuffisant.");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const newBalance = balanceRef.current - bet;
    setBalance(newBalance);
    balanceRef.current = newBalance;

    const ok = await persistBalance(newBalance);
    if (!ok) {
      setBalance(balanceRef.current + bet);
      balanceRef.current += bet;
      return;
    }

    const point = generateCrashPoint();
    crashPointRef.current = point;
    cashedOutRef.current = false;
    setActiveBet(bet);
    setMultiplier(1);
    setCurvePoints([1]);
    setCrashPoint(null);
    setMessage(null);
    setPhase("flying");
    phaseRef.current = "flying";
    startTimeRef.current = performance.now();
    sounds.playLaunch();
    rafRef.current = requestAnimationFrame(tick);
  }, [bet, isSyncing, persistBalance, profileLoading, sounds, tick]);

  const cashout = useCallback(async () => {
    if (phaseRef.current !== "flying" || cashedOutRef.current) return;

    cashedOutRef.current = true;
    stopLoop();

    const payout = calculateCashoutPayout(activeBet, multiplier);
    const newBalance = balanceRef.current + payout;
    setBalance(newBalance);
    balanceRef.current = newBalance;

    const ok = await persistBalance(newBalance);
    if (!ok) {
      setBalance(balanceRef.current - payout);
      balanceRef.current -= payout;
      cashedOutRef.current = false;
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    sounds.playCashout();
    setMessage(
      `Cashout ${formatMultiplier(multiplier)} · +${payout.toLocaleString("fr-FR")} jetons`
    );
    endRound("cashed_out", crashPointRef.current);
  }, [activeBet, endRound, multiplier, persistBalance, sounds, stopLoop, tick]);

  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  const changeBet = useCallback((delta: number) => {
    if (phaseRef.current !== "idle") return;
    const idx = CRASH_BET_OPTIONS.indexOf(bet as (typeof CRASH_BET_OPTIONS)[number]);
    const next = Math.max(
      0,
      Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
    );
    setBet(CRASH_BET_OPTIONS[next]);
  }, [bet]);

  const canPlaceBet =
    phase === "idle" && !profileLoading && !isSyncing && balance >= bet;
  const canCashout = phase === "flying";
  const potentialWin = calculateCashoutPayout(
    activeBet || bet,
    phase === "flying" ? multiplier : 1
  );

  return {
    balance,
    bet,
    phase,
    multiplier,
    activeBet,
    crashPoint,
    message,
    crashHistory,
    curvePoints,
    canPlaceBet,
    canCashout,
    potentialWin,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode,
    placeBet,
    cashout,
    changeBet,
  };
}
