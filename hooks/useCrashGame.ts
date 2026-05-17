"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import {
  calculateCashoutPayout,
  formatMultiplier,
} from "@/utils/crash/engine";
import {
  LocalCrashSimulator,
  LOCAL_CRASH_TICK_MS,
} from "@/utils/crash/local-simulator";
import type { CrashPhase } from "@/utils/crash/types";
import { useCrashSounds } from "@/hooks/useCrashSounds";
import { placeCrashBet, cashoutCrash } from "@/utils/supabase/crash-room";
import { safeGetUser } from "@/utils/supabase/client";
import { fetchProfile } from "@/utils/supabase/profiles";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";
const BALANCE_TIMEOUT_MS = 2000;
const LOCAL_USERNAME = "Toi";

function loadStoredBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  const n = raw ? Number(raw) : INITIAL_BALANCE;
  return Number.isFinite(n) && n >= 0 ? n : INITIAL_BALANCE;
}

function saveStoredBalance(amount: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_BALANCE_KEY, String(Math.max(0, Math.floor(amount))));
}

export type { CrashPhase };

/** Mode local prioritaire — le jeu tourne sans Supabase. */
export function useCrashGame() {
  const sounds = useCrashSounds();
  const simRef = useRef<LocalCrashSimulator | null>(null);

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

  /** Jamais de « … » sur le solde — affichage immédiat. */
  const [profileLoading] = useState(false);
  const [isSyncing] = useState(false);
  const [profileError] = useState<string | null>(null);
  const [isLocalPlay] = useState(true);

  const cashedOutRef = useRef(false);
  const hasPlacedBetRef = useRef(false);

  useEffect(() => {
    setBalance(loadStoredBalance());
  }, []);

  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new LocalCrashSimulator();
    }

    const sim = simRef.current;

    const id = setInterval(() => {
      const frame = sim.tick();

      setPhase(frame.phase);
      setBettingSecondsLeft(frame.bettingSecondsLeft);
      setMultiplier(frame.multiplier);
      setCrashPoint(frame.crashPoint);
      setRoundNumber(frame.roundNumber);

      if (frame.phase === "flying") {
        setCurvePoints((pts) => {
          const next = [...pts, frame.multiplier];
          return next.length > 80 ? next.slice(-80) : next;
        });
      }

      if (frame.justLaunched) {
        sounds.playLaunch();
        setCurvePoints([1]);
      }

      if (frame.justCrashed && frame.crashPoint) {
        sounds.playCrash();
        setCrashHistory((h) =>
          [frame.crashPoint!, ...h.filter((x) => x !== frame.crashPoint)].slice(
            0,
            12
          )
        );
        setMessage(`Crash à ${formatMultiplier(frame.crashPoint)} !`);
        setTimeout(() => setMessage(null), 2500);

        if (hasPlacedBetRef.current && !cashedOutRef.current) {
          setMessage("Tu n'as pas cashout à temps…");
          setTimeout(() => setMessage(null), 2500);
        }
      }

      if (frame.justNewRound) {
        cashedOutRef.current = false;
        setHasPlacedBet(false);
        setActiveBet(0);
        setHasCashedOut(false);
        setCurvePoints([1]);
      }
    }, LOCAL_CRASH_TICK_MS);

    return () => clearInterval(id);
  }, [sounds]);

  useEffect(() => {
    hasPlacedBetRef.current = hasPlacedBet;
  }, [hasPlacedBet]);

  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setBalance((b) => (b > 0 ? b : INITIAL_BALANCE));
      }
    }, BALANCE_TIMEOUT_MS);

    (async () => {
      try {
        const { user } = await safeGetUser();
        if (cancelled || !user) return;

        setUserId(user.id);

        const profileResult = await Promise.race([
          fetchProfile(user.id),
          new Promise<{ profile: null; error: string | null }>((resolve) =>
            setTimeout(
              () => resolve({ profile: null, error: "timeout" }),
              BALANCE_TIMEOUT_MS
            )
          ),
        ]);

        if (!cancelled && profileResult.profile) {
          const bal = Number(profileResult.profile.balance);
          if (Number.isFinite(bal) && bal >= 0) {
            setBalance(bal);
            saveStoredBalance(bal);
          }
        }
      } catch {
        /* garde le solde local */
      } finally {
        clearTimeout(timeout);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const placeBet = useCallback(() => {
    if (phase !== "betting" || bettingSecondsLeft <= 0) return;
    if (hasPlacedBet) return;
    if (balance < bet) {
      setMessage("Solde insuffisant.");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const nextBalance = balance - bet;
    setBalance(nextBalance);
    saveStoredBalance(nextBalance);
    setHasPlacedBet(true);
    setActiveBet(bet);
    setHasCashedOut(false);
    cashedOutRef.current = false;
    setMessage(`Mise de ${bet} jetons !`);
    setTimeout(() => setMessage(null), 2000);

    if (userId) void placeCrashBet(bet);
  }, [balance, bet, bettingSecondsLeft, hasPlacedBet, phase, userId]);

  const cashout = useCallback(() => {
    if (phase !== "flying" || !hasPlacedBet || hasCashedOut) return;
    if (cashedOutRef.current) return;

    cashedOutRef.current = true;
    setHasCashedOut(true);

    const payout = calculateCashoutPayout(activeBet, multiplier);
    const nextBalance = balance + payout;
    setBalance(nextBalance);
    saveStoredBalance(nextBalance);

    sounds.playCashout();
    setMessage(
      `Cashout ${formatMultiplier(multiplier)} · +${payout.toLocaleString("fr-FR")} jetons`
    );

    if (userId) void cashoutCrash(multiplier);
  }, [activeBet, balance, hasCashedOut, hasPlacedBet, multiplier, phase, sounds, userId]);

  const changeBet = useCallback(
    (delta: number) => {
      if (phase !== "betting" || hasPlacedBet) return;
      const idx = CRASH_BET_OPTIONS.indexOf(
        bet as (typeof CRASH_BET_OPTIONS)[number]
      );
      const next = Math.max(
        0,
        Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(CRASH_BET_OPTIONS[next]);
    },
    [bet, hasPlacedBet, phase]
  );

  const canPlaceBet =
    phase === "betting" &&
    bettingSecondsLeft > 0 &&
    !hasPlacedBet &&
    balance >= bet;

  const canCashout =
    phase === "flying" && hasPlacedBet && !hasCashedOut && !cashedOutRef.current;

  const potentialWin = calculateCashoutPayout(
    activeBet || bet,
    phase === "flying" ? multiplier : 1
  );

  const roundBets =
    hasPlacedBet && userId
      ? [
          {
            id: "local-bet",
            round_id: "local",
            user_id: userId,
            username: LOCAL_USERNAME,
            bet_amount: activeBet,
            cashout_multiplier: hasCashedOut ? multiplier : null,
            payout: hasCashedOut
              ? calculateCashoutPayout(activeBet, multiplier)
              : null,
            status: hasCashedOut
              ? ("cashed_out" as const)
              : phase === "crashed" && !hasCashedOut
                ? ("lost" as const)
                : ("active" as const),
          },
        ]
      : [];

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
    bettingSecondsLeft,
    chronoReady: true,
    roundBets,
    presence: [],
    activePlayersCount: hasPlacedBet ? 1 : 0,
    hasPlacedBet,
    hasCashedOut,
    connected: true,
    roundNumber,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode: isLocalPlay,
    placeBet,
    cashout,
    changeBet,
  };
}
