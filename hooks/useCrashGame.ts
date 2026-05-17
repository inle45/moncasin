"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import { createFallbackCrashState } from "@/utils/crash/default-state";
import {
  calculateCashoutPayout,
  formatMultiplier,
} from "@/utils/crash/engine";
import { fetchCrashLoop, LOOP_POLL_MS } from "@/utils/crash/api-client";
import { deriveVisualState } from "@/utils/crash/visual-state";
import { serverStateNeedsAdvance } from "@/utils/crash/visual-state";
import type {
  CrashBetRow,
  CrashPhase,
  CrashPublicState,
} from "@/utils/crash/types";
import type { CrashSnapshot } from "@/utils/crash/server-loop";
import {
  cashoutCrash,
  CRASH_CHANNEL,
  fetchCrashHistory,
  fetchRoundBets,
  placeCrashBet,
  syncCrashFromClient,
} from "@/utils/supabase/crash-room";
import { createClient, safeGetUser } from "@/utils/supabase/client";
import { isDemoMode as checkDemoMode } from "@/utils/supabase/config";
import { fetchProfile } from "@/utils/supabase/profiles";
import { useCrashSounds } from "@/hooks/useCrashSounds";
import type { RealtimeChannel } from "@supabase/supabase-js";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";
const API_STALE_MS = 3000;

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

export type { CrashPhase };

interface UseCrashGameOptions {
  initialSnapshot: CrashSnapshot;
}

function normalizeSnapshot(snap: CrashSnapshot): CrashSnapshot {
  return {
    ...snap,
    state: snap.state ?? createFallbackCrashState(snap.serverTime),
  };
}

export function useCrashGame({ initialSnapshot }: UseCrashGameOptions) {
  const sounds = useCrashSounds();
  const boot = normalizeSnapshot(initialSnapshot);

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [serverState, setServerState] = useState<CrashPublicState>(boot.state);
  const [visual, setVisual] = useState(() => deriveVisualState(boot.state));
  const [roundBets, setRoundBets] = useState<CrashBetRow[]>(boot.bets);
  const [crashHistory, setCrashHistory] = useState<number[]>(boot.history);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [message, setMessage] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(true);

  const [profileLoading, setProfileLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(
    boot.error
  );
  const [isDemoMode, setIsDemoMode] = useState(checkDemoMode());
  const [userId, setUserId] = useState<string | null>(null);

  const serverStateRef = useRef<CrashPublicState>(boot.state);
  const lastPhaseRef = useRef<CrashPhase | null>(boot.state.phase);
  const cashedOutRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastApiOkRef = useRef<number>(Date.now());
  const syncInFlightRef = useRef(false);

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
      const normalized = normalizeSnapshot(snap);
      const next = normalized.state;

      if (normalized.error) {
        setProfileError(normalized.error);
      } else if (normalized.source === "supabase") {
        setProfileError(null);
      }

      lastApiOkRef.current = Date.now();
      setApiConnected(true);

      if (normalized.history.length) {
        setCrashHistory(normalized.history);
      }

      const prev = lastPhaseRef.current;
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

      if (normalized.bets.length) {
        setRoundBets(normalized.bets);
      }
    },
    [sounds]
  );

  const loadBets = useCallback(async (roundId: string) => {
    const { bets } = await fetchRoundBets(roundId);
    if (bets.length) setRoundBets(bets);
  }, []);

  const syncGame = useCallback(async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;

    try {
      let snap = await fetchCrashLoop(serverStateRef.current.round_id);

      if (
        snap.source === "fallback" ||
        serverStateNeedsAdvance(snap.state)
      ) {
        const client = await syncCrashFromClient(10);
        if (client.data) {
          snap = {
            ...snap,
            state: client.data,
            source: "supabase",
            error: client.error,
          };
        }
      }

      applySnapshot(snap);

      const rid = snap.state.round_id;
      if (rid && !rid.startsWith("00000000")) {
        await loadBets(rid);
      }
    } finally {
      syncInFlightRef.current = false;
    }
  }, [applySnapshot, loadBets]);

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

  useEffect(() => {
    void syncGame();
    const id = setInterval(() => void syncGame(), LOOP_POLL_MS);
    return () => clearInterval(id);
  }, [syncGame]);

  useEffect(() => {
    const id = setInterval(() => {
      setApiConnected(Date.now() - lastApiOkRef.current < API_STALE_MS);
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(CRASH_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crash_bets" },
        () => {
          const rid = serverStateRef.current.round_id;
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

    const timeout = setTimeout(() => {
      if (mounted) setProfileLoading(false);
    }, 4000);

    (async () => {
      if (checkDemoMode()) {
        setIsDemoMode(true);
        setBalance(loadDemoBalance());
        if (mounted) setProfileLoading(false);
        clearTimeout(timeout);
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

      const { points } = await fetchCrashHistory();
      if (mounted && points.length) setCrashHistory(points);

      if (mounted) {
        setProfileLoading(false);
        clearTimeout(timeout);
      }
    })();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const placeBet = useCallback(async () => {
    if (!userId || isDemoMode) {
      setMessage("Connecte-toi pour jouer en multijoueur.");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    if (
      serverState.phase !== "betting" ||
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
    await loadBets(serverState.round_id);
    setMessage(`Mise de ${bet} jetons enregistrée !`);
    setTimeout(() => setMessage(null), 2000);
  }, [
    bet,
    balance,
    bettingSecondsLeft,
    hasPlacedBet,
    isDemoMode,
    loadBets,
    serverState.phase,
    serverState.round_id,
    userId,
  ]);

  const cashout = useCallback(async () => {
    if (
      !userId ||
      serverState.phase !== "flying" ||
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

    await loadBets(serverState.round_id);
  }, [multiplier, myBet, serverState.phase, serverState.round_id, sounds, userId]);

  const changeBet = useCallback(
    (delta: number) => {
      if (serverState.phase !== "betting" || hasPlacedBet) return;
      const idx = CRASH_BET_OPTIONS.indexOf(
        bet as (typeof CRASH_BET_OPTIONS)[number]
      );
      const next = Math.max(
        0,
        Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(CRASH_BET_OPTIONS[next]);
    },
    [bet, hasPlacedBet, serverState.phase]
  );

  const canPlaceBet =
    !!userId &&
    !isDemoMode &&
    serverState.phase === "betting" &&
    bettingSecondsLeft !== null &&
    bettingSecondsLeft > 0 &&
    !hasPlacedBet &&
    !profileLoading &&
    !isSyncing &&
    balance >= bet;

  const canCashout =
    serverState.phase === "flying" &&
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
    roundNumber: serverState.round_number ?? 0,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode,
    placeBet,
    cashout,
    changeBet,
  };
}
