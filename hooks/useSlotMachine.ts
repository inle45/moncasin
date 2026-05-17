"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import {
  BET_OPTIONS,
  DEFAULT_BET,
  FREE_SPINS_AWARD,
  INITIAL_BALANCE,
  REEL_STAGGER_MS,
  SPIN_DURATION_MS,
  SYMBOLS,
} from "@/utils/slot/constants";
import {
  evaluateSpin,
  generateGrid,
  getWinningCells,
  randomSymbol,
} from "@/utils/slot/engine";
import type { Grid, SpinPhase, SpinResult } from "@/utils/slot/types";
import { fetchProfile, updateProfileBalance } from "@/utils/supabase/profiles";
import { createClient, DEMO_MODE, safeGetUser } from "@/utils/supabase/client";

function randomGrid(): Grid {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => randomSymbol())
  );
}

function applyDemoState(
  setBalance: (n: number) => void,
  balanceRef: MutableRefObject<number>,
  userIdRef: MutableRefObject<string | null>,
  setIsAuthenticated: (v: boolean) => void,
  setProfileLoading: (v: boolean) => void
) {
  userIdRef.current = null;
  setIsAuthenticated(false);
  setBalance(INITIAL_BALANCE);
  balanceRef.current = INITIAL_BALANCE;
  setProfileLoading(false);
}

export function useSlotMachine() {
  const demo = DEMO_MODE;

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [displayGrid, setDisplayGrid] = useState<Grid>(() => randomGrid());
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [freeSpinMode, setFreeSpinMode] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winMessage, setWinMessage] = useState<string | null>(null);
  const [comboCount, setComboCount] = useState(0);

  const [profileLoading, setProfileLoading] = useState(!demo);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(demo);

  const finalGridRef = useRef<Grid>(displayGrid);
  const stoppedRef = useRef([true, true, true]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const freeSpinModeRef = useRef(false);
  const balanceRef = useRef(INITIAL_BALANCE);
  const userIdRef = useRef<string | null>(null);
  const spinStartBalanceRef = useRef(INITIAL_BALANCE);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const winningCells = useMemo(
    () => (lastResult ? getWinningCells(lastResult) : new Set<string>()),
    [lastResult]
  );

  const isSpinning = phase === "spinning" || phase === "revealing";

  const loadProfile = useCallback(async (userId: string) => {
    const { profile, error } = await fetchProfile(userId);

    if (error || !profile) {
      setProfileError(error ?? "Profil introuvable");
      applyDemoState(
        setBalance,
        balanceRef,
        userIdRef,
        setIsAuthenticated,
        setProfileLoading
      );
      setIsDemoMode(true);
      return;
    }

    setProfileError(null);
    const dbBalance = Number(profile.balance);
    setBalance(dbBalance);
    balanceRef.current = dbBalance;
    setIsDemoMode(false);
  }, []);

  useEffect(() => {
    if (demo) {
      applyDemoState(
        setBalance,
        balanceRef,
        userIdRef,
        setIsAuthenticated,
        setProfileLoading
      );
      setIsDemoMode(true);
      return;
    }

    let mounted = true;

    async function init() {
      setProfileLoading(true);
      setProfileError(null);

      const { user, timedOut } = await safeGetUser();

      if (!mounted) return;

      if (timedOut || !user) {
        applyDemoState(
          setBalance,
          balanceRef,
          userIdRef,
          setIsAuthenticated,
          setProfileLoading
        );
        if (timedOut) {
          setProfileError(null);
        }
        setIsDemoMode(true);
        return;
      }

      userIdRef.current = user.id;
      setIsAuthenticated(true);
      await loadProfile(user.id);
      if (mounted) setProfileLoading(false);
    }

    init();

    const supabase = createClient();
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        applyDemoState(
          setBalance,
          balanceRef,
          userIdRef,
          setIsAuthenticated,
          () => {}
        );
        setIsDemoMode(true);
        return;
      }

      userIdRef.current = session.user.id;
      setIsAuthenticated(true);
      setProfileLoading(true);
      await loadProfile(session.user.id);
      setProfileLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [demo, loadProfile]);

  const persistBalance = useCallback(
    async (newBalance: number) => {
      if (isDemoMode || !userIdRef.current) return true;

      setIsSyncing(true);
      const { error } = await updateProfileBalance(userIdRef.current, newBalance);
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

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const spin = useCallback(() => {
    if (phase === "spinning" || phase === "revealing") return;
    if (profileLoading || isSyncing) return;

    const isFree = freeSpinsLeft > 0;
    if (!isFree && balanceRef.current < bet) {
      setWinMessage("Solde insuffisant !");
      setTimeout(() => setWinMessage(null), 2000);
      return;
    }

    clearTick();
    setWinMessage(null);
    setLastResult(null);
    setPhase("spinning");
    stoppedRef.current = [false, false, false];

    spinStartBalanceRef.current = balanceRef.current;

    if (!isFree) {
      const afterBet = balanceRef.current - bet;
      setBalance(afterBet);
      balanceRef.current = afterBet;
    } else {
      setFreeSpinsLeft((n) => Math.max(0, n - 1));
    }

    const finalGrid = generateGrid();
    finalGridRef.current = finalGrid;

    tickRef.current = setInterval(() => {
      setDisplayGrid(
        Array.from({ length: 3 }, (_, ri) =>
          Array.from({ length: 3 }, (_, ci) =>
            stoppedRef.current[ci]
              ? finalGridRef.current[ri][ci]
              : randomSymbol()
          )
        )
      );
    }, 80);

    const stopReel = (colIndex: number) => {
      stoppedRef.current[colIndex] = true;
      setDisplayGrid(
        Array.from({ length: 3 }, (_, ri) =>
          Array.from({ length: 3 }, (_, ci) =>
            stoppedRef.current[ci]
              ? finalGridRef.current[ri][ci]
              : randomSymbol()
          )
        )
      );
    };

    const t0 = SPIN_DURATION_MS;
    setTimeout(() => stopReel(0), t0);
    setTimeout(() => stopReel(1), t0 + REEL_STAGGER_MS);
    setTimeout(() => stopReel(2), t0 + REEL_STAGGER_MS * 2);

    const finishAt = t0 + REEL_STAGGER_MS * 2 + 400;
    setTimeout(async () => {
      clearTick();
      stoppedRef.current = [true, true, true];
      setDisplayGrid(finalGrid);
      setPhase("revealing");

      const activeFreeMode = isFree || freeSpinModeRef.current;
      const result = evaluateSpin(finalGrid, bet, activeFreeMode);
      setLastResult(result);
      setComboCount(result.lineWins.length);

      const betDebited = isFree ? 0 : bet;
      const finalBalance =
        spinStartBalanceRef.current - betDebited + result.totalPayout;

      setBalance(finalBalance);
      balanceRef.current = finalBalance;

      if (userIdRef.current && !isDemoMode) {
        const ok = await persistBalance(finalBalance);
        if (!ok) {
          setBalance(spinStartBalanceRef.current);
          balanceRef.current = spinStartBalanceRef.current;
          setWinMessage("Erreur de sauvegarde — solde restauré.");
          setPhase("idle");
          return;
        }
      }

      if (result.triggersFreeSpins) {
        freeSpinModeRef.current = true;
        setFreeSpinMode(true);
        setFreeSpinsLeft((n) => n + FREE_SPINS_AWARD);
        setWinMessage(
          `FREE SPINS ! +${FREE_SPINS_AWARD} tours · multiplicateur x2`
        );
      } else if (result.jackpotWin) {
        setWinMessage(
          `JACKPOT ${result.jackpotWin.tier.toUpperCase()} · +${result.jackpotWin.payout.toLocaleString("fr-FR")} jetons`
        );
      } else if (result.lineWins.length > 0) {
        const combo =
          result.lineWins.length > 1
            ? ` · COMBO ×${result.comboMultiplier}`
            : "";
        setWinMessage(
          `+${result.totalPayout.toLocaleString("fr-FR")} jetons${combo}`
        );
      }

      setPhase("celebrating");

      setTimeout(() => {
        setPhase("idle");
        setFreeSpinsLeft((remaining) => {
          if (remaining <= 0 && !result.triggersFreeSpins) {
            freeSpinModeRef.current = false;
            setFreeSpinMode(false);
          }
          return remaining;
        });
      }, 2200);
    }, finishAt);
  }, [
    bet,
    clearTick,
    freeSpinsLeft,
    isDemoMode,
    isSyncing,
    persistBalance,
    phase,
    profileLoading,
  ]);

  const changeBet = useCallback(
    (delta: number) => {
      if (phase === "spinning" || phase === "revealing") return;
      const idx = BET_OPTIONS.indexOf(bet as (typeof BET_OPTIONS)[number]);
      const nextIdx = Math.max(
        0,
        Math.min(BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(BET_OPTIONS[nextIdx]);
    },
    [bet, phase]
  );

  return {
    balance,
    bet,
    displayGrid,
    phase,
    isSpinning,
    freeSpinsLeft,
    freeSpinMode,
    lastResult,
    winMessage,
    comboCount,
    winningCells,
    spin,
    changeBet,
    symbols: SYMBOLS,
    profileLoading,
    isAuthenticated,
    isSyncing,
    profileError,
    isDemoMode,
  };
}
