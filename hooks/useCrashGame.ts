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
import { fetchCrashLoop, LOOP_POLL_MS } from "@/utils/crash/api-client";
import { deriveVisualState } from "@/utils/crash/visual-state";
import type {
  CrashBetRow,
  CrashPhase,
  CrashPublicState,
} from "@/utils/crash/types";
import type { CrashSnapshot } from "@/utils/crash/server-loop";
import {
  cashoutCrash,
  CRASH_CHANNEL,
  fetchRoundBets,
  placeCrashBet,
} from "@/utils/supabase/crash-room";
import { DEMO_MODE, createClient, safeGetUser } from "@/utils/supabase/client";
import { fetchProfile } from "@/utils/supabase/profiles";
import { useCrashSounds } from "@/hooks/useCrashSounds";
import type { RealtimeChannel } from "@supabase/supabase-js";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";
const API_STALE_MS = 4000;

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

export type { CrashPhase };

interface UseCrashGameOptions {
  initialSnapshot: CrashSnapshot;
}

export function useCrashGame({ initialSnapshot }: UseCrashGameOptions) {
  const sounds = useCrashSounds();

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [serverState, setServerState] = useState<CrashPublicState | null>(
    initialSnapshot.state
  );
  const [visual, setVisual] = useState(() =>
    deriveVisualState(initialSnapshot.state)
  );
  const [roundBets, setRoundBets] = useState<CrashBetRow[]>(
    initialSnapshot.bets
  );
  const [crashHistory, setCrashHistory] = useState<number[]>(
    initialSnapshot.history
  );
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [message, setMessage] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(!initialSnapshot.error);

  const [profileLoading, setProfileLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(
    initialSnapshot.error
  );
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE);
  const [userId, setUserId] = useState<string | null>(null);

  const serverStateRef = useRef<CrashPublicState | null>(initialSnapshot.state);
  const lastPhaseRef = useRef<CrashPhase | null>(
    initialSnapshot.state?.phase ?? null
  );
  const cashedOutRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastApiOkRef = useRef<number>(Date.now());

  const phase = visual.phase;
  const multiplier = visual.multiplier;
  const bettingSecondsLeft = visual.bettingSecondsLeft;
  const crashPoint = visual.crashPoint;

  useEffect(() => {
    serverStateRef.current = serverState;
  }, [serverState]);

  const myBet = roundBets.find((b) => b.user_id === userId) ?? null;
  const hasPlacedBet = !!myBet;
  const hasCashedOut = myBet?.status === "cashed_out";

  const applySnapshot = useCallback(
    (snap: CrashSnapshot) => {
      if (snap.error && !snap.state) {
        setProfileError(snap.error);
        setApiConnected(false);
        return;
      }

      if (snap.error) {
        setProfileError(snap.error);
      } else {
        setProfileError(null);
      }

      lastApiOkRef.current = Date.now();
      setApiConnected(true);

      if (snap.history.length) {
        setCrashHistory(snap.history);
      }

      if (!snap.state) return;

      const prev = lastPhaseRef.current;
      const next = snap.state;
      setServerState(next);

      if (next.phase === "betting" && prev !== "betting") {
        cashedOutRef.current = false;
        setCurvePoints([1]);
      }

      if (next.phase === "flying" && prev !== "flying") {
        sounds.playLaunch();
        setCurvePoints([1]);
      }

      if (next.phase === "crashed" && prev !== "crashed" && next.crash_point) {
        sounds.playCrash();
        setMessage(`Crash à ${formatMultiplier(next.crash_point)} !`);
        setTimeout(() => setMessage(null), 2500);
      }

      lastPhaseRef.current = next.phase;

      if (snap.bets.length) {
        setRoundBets(snap.bets);
      }
    },
    [sounds]
  );

  const loadBets = useCallback(async (roundId: string) => {
    const { bets } = await fetchRoundBets(roundId);
    if (bets.length) setRoundBets(bets);
  }, []);

  /** Horloge locale fluide (indépendante de Realtime). */
  useEffect(() => {
    const tickVisual = () => {
      const v = deriveVisualState(serverStateRef.current);
      setVisual(v);

      if (v.phase === "flying") {
        setCurvePoints((pts) => {
          const next = [...pts, v.multiplier];
          return next.length > 80 ? next.slice(-80) : next;
        });
      }
    };

    tickVisual();
    const id = setInterval(tickVisual, 80);
    return () => clearInterval(id);
  }, []);

  /** Boucle serveur autonome via API (spectateur OK, sans auth). */
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const snap = await fetchCrashLoop(serverStateRef.current?.round_id);
      if (cancelled) return;
      applySnapshot(snap);

      const rid = snap.state?.round_id;
      if (rid && snap.bets.length === 0) {
        await loadBets(rid);
      }
    };

    void poll();
    const id = setInterval(() => void poll(), LOOP_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [applySnapshot, loadBets]);

  /** Statut « Live » = API récente (pas Realtime). */
  useEffect(() => {
    const id = setInterval(() => {
      setApiConnected(Date.now() - lastApiOkRef.current < API_STALE_MS);
    }, 500);
    return () => clearInterval(id);
  }, []);

  /** Realtime optionnel : mises à jour des paris uniquement. */
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(CRASH_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crash_bets" },
        () => {
          const rid = serverStateRef.current?.round_id;
          if (rid) void loadBets(rid);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [loadBets]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setProfileLoading(true);

      if (DEMO_MODE) {
        setIsDemoMode(true);
        setBalance(loadDemoBalance());
        setProfileLoading(false);
        return;
      }

      const { user } = await safeGetUser();
      if (!mounted) return;

      if (user) {
        setUserId(user.id);
        const { profile } = await fetchProfile(user.id);
        if (profile) {
          setBalance(Number(profile.balance));
          setIsDemoMode(false);
        } else {
          setIsDemoMode(true);
          setBalance(loadDemoBalance());
        }
      } else {
        setIsDemoMode(true);
        setBalance(loadDemoBalance());
      }

      setProfileLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const placeBet = useCallback(async () => {
    if (!userId || isDemoMode) {
      setMessage("Connecte-toi pour jouer en multijoueur.");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    if (
      serverState?.phase !== "betting" ||
      bettingSecondsLeft === null ||
      bettingSecondsLeft <= 0
    ) {
      return;
    }
    if (hasPlacedBet) return;
    if (balance < bet) {
      setMessage("Solde insuffisant.");
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    setIsSyncing(true);
    const result = await placeCrashBet(bet);
    setIsSyncing(false);

    if (!result.ok) {
      setMessage(result.error ?? "Mise refusée");
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (result.balance != null) setBalance(result.balance);
    if (serverState?.round_id) await loadBets(serverState.round_id);
    setMessage(`Mise de ${bet} jetons enregistrée !`);
    setTimeout(() => setMessage(null), 2000);
  }, [
    bet,
    balance,
    bettingSecondsLeft,
    hasPlacedBet,
    isDemoMode,
    loadBets,
    serverState?.phase,
    serverState?.round_id,
    userId,
  ]);

  const cashout = useCallback(async () => {
    if (
      !userId ||
      serverState?.phase !== "flying" ||
      !myBet ||
      myBet.status !== "active"
    ) {
      return;
    }
    if (cashedOutRef.current) return;

    cashedOutRef.current = true;
    setIsSyncing(true);
    const result = await cashoutCrash(multiplier);
    setIsSyncing(false);

    if (!result.ok) {
      cashedOutRef.current = false;
      setMessage(result.error ?? "Cashout échoué");
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    const finalMult = result.multiplier ?? multiplier;
    const payout =
      result.payout ?? calculateCashoutPayout(myBet.bet_amount, finalMult);

    if (result.balance != null) setBalance(result.balance);

    sounds.playCashout();
    setMessage(
      `Cashout ${formatMultiplier(finalMult)} · +${payout.toLocaleString("fr-FR")} jetons`
    );

    if (serverState?.round_id) await loadBets(serverState.round_id);
  }, [multiplier, myBet, serverState?.phase, serverState?.round_id, sounds, userId]);

  const changeBet = useCallback(
    (delta: number) => {
      if (serverState?.phase !== "betting" || hasPlacedBet) return;
      const idx = CRASH_BET_OPTIONS.indexOf(
        bet as (typeof CRASH_BET_OPTIONS)[number]
      );
      const next = Math.max(
        0,
        Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(CRASH_BET_OPTIONS[next]);
    },
    [bet, hasPlacedBet, serverState?.phase]
  );

  const canPlaceBet =
    !!userId &&
    !isDemoMode &&
    serverState?.phase === "betting" &&
    bettingSecondsLeft !== null &&
    bettingSecondsLeft > 0 &&
    !hasPlacedBet &&
    !profileLoading &&
    !isSyncing &&
    balance >= bet;

  const canCashout =
    serverState?.phase === "flying" &&
    !!myBet &&
    myBet.status === "active" &&
    !cashedOutRef.current &&
    !isSyncing;

  const potentialWin = calculateCashoutPayout(
    myBet?.bet_amount ?? bet,
    phase === "flying" ? multiplier : 1
  );

  return {
    balance,
    bet,
    phase,
    multiplier,
    activeBet: myBet?.bet_amount ?? 0,
    crashPoint,
    message,
    crashHistory,
    curvePoints,
    canPlaceBet,
    canCashout,
    potentialWin,
    bettingSecondsLeft,
    chronoReady: bettingSecondsLeft !== null,
    roundBets,
    presence: [],
    activePlayersCount: roundBets.length,
    hasPlacedBet,
    hasCashedOut,
    connected: apiConnected,
    roundNumber: serverState?.round_number ?? 0,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode,
    placeBet,
    cashout,
    changeBet,
  };
}
