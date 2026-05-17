"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import type { CrashPhase } from "@/utils/crash/types";

const START_BALANCE = 1000;
const BETTING_MS = 5000;
const CRASH_DISPLAY_MS = 2500;

export type { CrashPhase };

type Mode = "betting" | "flying" | "crashed";

/**
 * MODE SECOURS — aucun fetch, aucun Supabase.
 * setInterval brut dès le montage : solde 1000, chrono 5→0, multiplicateur qui monte.
 */
export function useCrashGame() {
  const [balance, setBalance] = useState(START_BALANCE);
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

  const modeRef = useRef<Mode>("betting");
  const bettingEndsRef = useRef(0);
  const flyingStartRef = useRef(0);
  const crashedStartRef = useRef(0);
  const targetCrashRef = useRef(2.5);
  const roundRef = useRef(1);
  const placedRef = useRef(false);
  const cashedRef = useRef(false);

  // /* Supabase / fetch désactivés
  // import { placeCrashBet, cashoutCrash } from "@/utils/supabase/crash-room";
  // import { safeGetUser } from "@/utils/supabase/client";
  // import { fetchProfile } from "@/utils/supabase/profiles";
  // import { fetchCrashLoop } from "@/utils/crash/api-client";
  // import { LocalCrashSimulator } from "@/utils/crash/local-simulator";
  // import { useCrashSounds } from "@/hooks/useCrashSounds";
  // */

  useEffect(() => {
    const now = Date.now();
    setBalance(START_BALANCE);
    modeRef.current = "betting";
    bettingEndsRef.current = now + BETTING_MS;
    targetCrashRef.current = 1.5 + Math.random() * 4;
    setBettingSecondsLeft(5);
    setPhase("betting");
    setMultiplier(1);
    setCurvePoints([1]);

    const id = setInterval(() => {
      const t = Date.now();

      if (modeRef.current === "betting") {
        const left = Math.max(0, Math.ceil((bettingEndsRef.current - t) / 1000));
        setBettingSecondsLeft(left);
        setPhase("betting");
        setMultiplier(1);
        setCrashPoint(null);
        setCurvePoints([1]);

        if (t >= bettingEndsRef.current) {
          modeRef.current = "flying";
          flyingStartRef.current = t;
          setPhase("flying");
        }
        return;
      }

      if (modeRef.current === "flying") {
        const sec = (t - flyingStartRef.current) / 1000;
        const m = Math.floor(Math.exp(0.12 * sec) * 100) / 100;
        setPhase("flying");
        setMultiplier(m);
        setBettingSecondsLeft(0);
        setCurvePoints((pts) => {
          const next = [...pts, m];
          return next.length > 60 ? next.slice(-60) : next;
        });

        if (m >= targetCrashRef.current) {
          modeRef.current = "crashed";
          crashedStartRef.current = t;
          setCrashPoint(targetCrashRef.current);
          setPhase("crashed");
          setCrashHistory((h) =>
            [targetCrashRef.current, ...h].slice(0, 8)
          );
          if (placedRef.current && !cashedRef.current) {
            setMessage("Crash ! Mise perdue.");
            setTimeout(() => setMessage(null), 2000);
          }
        }
        return;
      }

      if (modeRef.current === "crashed") {
        setPhase("crashed");
        setMultiplier(targetCrashRef.current);
        if (t >= crashedStartRef.current + CRASH_DISPLAY_MS) {
          roundRef.current += 1;
          setRoundNumber(roundRef.current);
          modeRef.current = "betting";
          bettingEndsRef.current = t + BETTING_MS;
          targetCrashRef.current = 1.5 + Math.random() * 4;
          placedRef.current = false;
          cashedRef.current = false;
          setHasPlacedBet(false);
          setHasCashedOut(false);
          setActiveBet(0);
          setBettingSecondsLeft(5);
          setPhase("betting");
          setMultiplier(1);
          setCrashPoint(null);
          setCurvePoints([1]);
        }
      }
    }, 100);

    return () => clearInterval(id);
  }, []);

  const placeBet = useCallback(() => {
    if (modeRef.current !== "betting" || bettingSecondsLeft <= 0) return;
    if (placedRef.current) return;
    if (balance < bet) return;

    placedRef.current = true;
    setHasPlacedBet(true);
    setActiveBet(bet);
    setBalance((b) => b - bet);
    setMessage(`Mise ${bet} jetons`);
    setTimeout(() => setMessage(null), 1500);
  }, [balance, bet, bettingSecondsLeft]);

  const cashout = useCallback(() => {
    if (modeRef.current !== "flying" || !placedRef.current) return;
    if (cashedRef.current) return;

    cashedRef.current = true;
    setHasCashedOut(true);
    const win = Math.floor(activeBet * multiplier);
    setBalance((b) => b + win);
    setMessage(`Cashout +${win} jetons`);
    setTimeout(() => setMessage(null), 2000);
  }, [activeBet, multiplier]);

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
      phase === "betting" && bettingSecondsLeft > 0 && !hasPlacedBet && balance >= bet,
    canCashout: phase === "flying" && hasPlacedBet && !hasCashedOut,
    potentialWin: Math.floor((activeBet || bet) * multiplier),
    bettingSecondsLeft,
    chronoReady: true,
    roundBets: [],
    presence: [],
    activePlayersCount: hasPlacedBet ? 1 : 0,
    hasPlacedBet,
    hasCashedOut,
    connected: true,
    roundNumber,
    profileLoading: false,
    isSyncing: false,
    profileError: null,
    isDemoMode: true,
    placeBet,
    cashout,
    changeBet,
  };
}
