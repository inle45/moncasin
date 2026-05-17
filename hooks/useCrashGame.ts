"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import { syncCrashBalanceQuiet } from "@/utils/crash/balance-sync";
import {
  LocalCrashSimulator,
  LOCAL_CRASH_TICK_MS,
} from "@/utils/crash/local-simulator";
import type { CrashPhase } from "@/utils/crash/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { isDemoMode } from "@/utils/supabase/config";
import { safeGetUser } from "@/utils/supabase/client";
import { fetchProfile } from "@/utils/supabase/profiles";

export type { CrashPhase };

/**
 * Moteur UI local (LocalCrashSimulator 50ms) + sync Supabase en arrière-plan.
 * L'interface ne dépend jamais du réseau.
 */
export function useCrashGame() {
  const simRef = useRef<LocalCrashSimulator | null>(null);
  const userIdRef = useRef<string | null>(null);
  const balanceRef = useRef(INITIAL_BALANCE);

  const placedRef = useRef(false);
  const cashedRef = useRef(false);
  const activeBetRef = useRef(0);

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [phase, setPhase] = useState<CrashPhase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [bettingSecondsLeft, setBettingSecondsLeft] = useState(5);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [activeBet, setActiveBet] = useState(0);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const setBalanceTracked = useCallback((next: number | ((prev: number) => number)) => {
    setBalance((prev) => {
      const value =
        typeof next === "function"
          ? (next as (p: number) => number)(prev)
          : next;
      const safe = Math.max(0, Math.floor(value));
      balanceRef.current = safe;
      return safe;
    });
  }, []);

  const syncBalanceIfLoggedIn = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid || isDemoMode()) return;
    syncCrashBalanceQuiet(uid, balanceRef.current);
  }, []);

  // Solde local immédiat, puis profil Supabase en arrière-plan
  useEffect(() => {
    if (isDemoMode()) return;

    let cancelled = false;

    void (async () => {
      const { user } = await safeGetUser();
      if (cancelled || !user) return;

      userIdRef.current = user.id;
      setUserId(user.id);

      const { profile, error } = await fetchProfile(user.id);
      if (cancelled || !profile || error) return;

      const remote = Math.max(0, Math.floor(Number(profile.balance)));
      setBalanceTracked(remote);
    })();

    return () => {
      cancelled = true;
    };
  }, [setBalanceTracked]);

  // Moteur local — setInterval 50ms
  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new LocalCrashSimulator();
    }
    const sim = simRef.current;

    const id = setInterval(() => {
      const tick = sim.tick();

      setPhase(tick.phase);
      setBettingSecondsLeft(tick.bettingSecondsLeft);
      setMultiplier(tick.multiplier);
      setCrashPoint(tick.crashPoint);
      setRoundNumber(tick.roundNumber);

      if (tick.phase === "flying") {
        setCurvePoints((pts) => {
          const next = [...pts, tick.multiplier];
          return next.length > 60 ? next.slice(-60) : next;
        });
      } else if (tick.phase === "betting" && tick.justNewRound) {
        setCurvePoints([1]);
      }

      if (tick.justCrashed && tick.crashPoint != null) {
        setCrashHistory((h) => [tick.crashPoint!, ...h].slice(0, 8));
        if (placedRef.current && !cashedRef.current) {
          setMessage("Crash ! Mise perdue.");
          window.setTimeout(() => setMessage(null), 2000);
        }
      }

      if (tick.justNewRound) {
        placedRef.current = false;
        cashedRef.current = false;
        activeBetRef.current = 0;
        setHasPlacedBet(false);
        setHasCashedOut(false);
        setActiveBet(0);
        syncBalanceIfLoggedIn();
      }
    }, LOCAL_CRASH_TICK_MS);

    return () => clearInterval(id);
  }, [syncBalanceIfLoggedIn]);

  const placeBet = useCallback(() => {
    if (phase !== "betting" || bettingSecondsLeft <= 0) return;
    if (placedRef.current) return;
    if (balanceRef.current < bet) return;

    placedRef.current = true;
    activeBetRef.current = bet;
    setHasPlacedBet(true);
    setActiveBet(bet);
    setBalanceTracked((b) => b - bet);
    setMessage(`Mise ${bet} jetons`);
    window.setTimeout(() => setMessage(null), 1500);
  }, [phase, bettingSecondsLeft, bet, setBalanceTracked]);

  const cashout = useCallback(() => {
    if (phase !== "flying" || !placedRef.current || cashedRef.current) return;

    const stake = activeBetRef.current;
    const win = Math.floor(stake * multiplier);
    cashedRef.current = true;
    setHasCashedOut(true);
    setBalanceTracked((b) => b + win);
    setMessage(`Cashout +${win} jetons`);
    window.setTimeout(() => setMessage(null), 2000);
  }, [phase, multiplier, setBalanceTracked]);

  const changeBet = useCallback(
    (delta: number) => {
      if (placedRef.current) return;
      const idx = CRASH_BET_OPTIONS.indexOf(
        bet as (typeof CRASH_BET_OPTIONS)[number]
      );
      const next = Math.max(
        0,
        Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(CRASH_BET_OPTIONS[next]);
    },
    [bet]
  );

  const demo = isDemoMode() || !userId;

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
    canPlaceBet:
      phase === "betting" &&
      bettingSecondsLeft > 0 &&
      !hasPlacedBet &&
      balance >= bet,
    canCashout: phase === "flying" && hasPlacedBet && !hasCashedOut,
    potentialWin: Math.floor((activeBet || bet) * multiplier),
    bettingSecondsLeft,
    chronoReady: true,
    roundBets: [],
    presence: [],
    activePlayersCount: hasPlacedBet ? 1 : 0,
    hasPlacedBet,
    hasCashedOut,
    connected: !!userId,
    roundNumber,
    profileLoading: false,
    isSyncing: false,
    profileError: null,
    isDemoMode: demo,
    placeBet,
    cashout,
    changeBet,
  };
}
