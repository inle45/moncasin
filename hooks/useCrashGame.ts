"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  crashStateSignature,
  runCrashLoopTick,
} from "@/utils/crash/advance-client";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import { computeClockOffsetMs, syncedNowMs } from "@/utils/crash/client-clock";
import { deriveVisualState } from "@/utils/crash/visual-state";
import { normalizeRoundId } from "@/utils/crash/uuid";
import { liveStateRowToPublic } from "@/utils/crash/live-state";
import {
  LocalCrashSimulator,
  LOCAL_CRASH_TICK_MS,
} from "@/utils/crash/local-simulator";
import type { CrashBetRow, CrashPhase, CrashPublicState } from "@/utils/crash/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode, isSupabaseConfigured } from "@/utils/supabase/config";
import {
  CRASH_CHANNEL,
  cashoutCrash,
  fetchCrashHistory,
  fetchCrashServerNowMs,
  fetchCrashState,
  fetchCrashStateFromTable,
  fetchRoundBets,
  placeCrashBet,
} from "@/utils/supabase/crash-room";
import { fetchProfile } from "@/utils/supabase/profiles";

export type { CrashPhase };

/** Boucle multijoueur : crash_advance_tick idempotent côté client (pas de cron Vercel). */
const LOOP_TICK_MS = 500;
const VISUAL_TICK_MS = 50;
const REALTIME_STALE_MS = 30_000;
const STATE_POLL_MS = 3_000;

export function useCrashGame() {
  const serverStateRef = useRef<CrashPublicState | null>(null);
  const roundIdRef = useRef("");
  const userIdRef = useRef<string | null>(null);
  const fallbackSimRef = useRef<LocalCrashSimulator | null>(null);
  const advancingRef = useRef(false);
  const placingBetRef = useRef(false);
  const lastRealtimeAtRef = useRef(0);
  const lastCurveMRef = useRef(1);
  const lastKnownStateRef = useRef<CrashPublicState | null>(null);
  /** offset = serverTimeMs - Date.now() à la dernière sync (horloge Supabase). */
  const clockOffsetRef = useRef(0);

  const syncClockFromServer = useCallback((serverTimeMs: number | null | undefined) => {
    if (serverTimeMs == null || !Number.isFinite(serverTimeMs)) return;
    clockOffsetRef.current = computeClockOffsetMs(serverTimeMs);
  }, []);

  const nowSynced = useCallback(
    () => syncedNowMs(clockOffsetRef.current),
    []
  );

  const [serverState, setServerState] = useState<CrashPublicState | null>(null);
  const [useFallback, setUseFallback] = useState(!isSupabaseConfigured());
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [phase, setPhase] = useState<CrashPhase>("betting");
  const [multiplier, setMultiplier] = useState(1);
  const [bettingSecondsLeft, setBettingSecondsLeft] = useState<number | null>(5);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [roundBets, setRoundBets] = useState<CrashBetRow[]>([]);
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(isSupabaseConfigured());
  const [profileError, setProfileError] = useState<string | null>(null);
  const [tickError, setTickError] = useState<string | null>(null);

  const setBalanceTracked = useCallback((next: number) => {
    setBalance(Math.max(0, Math.floor(next)));
  }, []);

  const applyServerState = useCallback((state: CrashPublicState) => {
    const prevRound = roundIdRef.current;
    const prevSig = serverStateRef.current
      ? crashStateSignature(serverStateRef.current)
      : "";
    const nextSig = crashStateSignature(state);

    serverStateRef.current = state;
    lastKnownStateRef.current = state;
    setUseFallback(false);
    lastRealtimeAtRef.current = Date.now();

    if (nextSig !== prevSig) {
      setServerState(state);
      setRoundNumber(state.round_number);
    }

    if (state.round_id && state.round_id !== prevRound) {
      roundIdRef.current = state.round_id;
      lastCurveMRef.current = 1;
      setCurvePoints([1]);
      setHasPlacedBet(false);
      setHasCashedOut(false);
    } else if (state.round_id) {
      roundIdRef.current = state.round_id;
    }
  }, []);

  const reloadBets = useCallback(async (roundId?: string) => {
    const rid = roundId ?? roundIdRef.current;
    if (!rid) return;
    const { bets } = await fetchRoundBets(rid);
    setRoundBets(bets);

    const uid = userIdRef.current;
    if (!uid) return;
    const mine = bets.find((b) => b.user_id === uid);
    if (mine) {
      setHasPlacedBet(true);
      setHasCashedOut(mine.status === "cashed_out");
    }
  }, []);

  const refreshServerState = useCallback(async () => {
    const [table, serverNow] = await Promise.all([
      fetchCrashStateFromTable(),
      fetchCrashServerNowMs(),
    ]);
    syncClockFromServer(serverNow);
    if (table.data) {
      applyServerState(table.data);
      await reloadBets(table.data.round_id);
      return table.data;
    }
    if (table.error) setProfileError(table.error);
    return null;
  }, [applyServerState, reloadBets, syncClockFromServer]);

  const bootstrap = useCallback(async () => {
    if (!isSupabaseConfigured() || isDemoMode()) {
      setUseFallback(true);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const [{ data: state, error }, { points }, serverNow] = await Promise.all([
      fetchCrashState(),
      fetchCrashHistory(12),
      fetchCrashServerNowMs(),
    ]);
    syncClockFromServer(serverNow);

    if (points.length) setCrashHistory(points);

    if (state?.round_id) {
      applyServerState(state);
      await reloadBets(state.round_id);
    } else if (state) {
      const tick = await runCrashLoopTick();
      syncClockFromServer(tick.serverTimeMs);
      if (tick.errors.length) setTickError(tick.errors.join(" · "));
      if (tick.state?.round_id) {
        applyServerState(tick.state);
        await reloadBets(tick.state.round_id);
      }
    } else {
      const retried = await refreshServerState();
      if (!retried) {
        setUseFallback(true);
        if (error) setProfileError(error);
      }
    }

    setIsSyncing(false);
  }, [applyServerState, reloadBets, refreshServerState, syncClockFromServer]);

  // Session + solde : affichage local immédiat, sync via onAuthStateChange
  useEffect(() => {
    if (isDemoMode()) return;

    const supabase = createClient();
    if (!supabase) return;

    let cancelled = false;

    const applyUser = async (uid: string | null) => {
      if (cancelled) return;

      if (!uid) {
        userIdRef.current = null;
        setUserId(null);
        setHasPlacedBet(false);
        setHasCashedOut(false);
        setProfileError(null);
        setBalanceTracked(INITIAL_BALANCE);
        return;
      }

      userIdRef.current = uid;
      setUserId(uid);
      setProfileError(null);

      const { profile, error } = await fetchProfile(uid);
      if (cancelled) return;
      if (error) setProfileError(error);
      if (profile) {
        setBalanceTracked(Math.max(0, Math.floor(Number(profile.balance))));
      }
      void reloadBets();
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void applyUser(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUser(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [setBalanceTracked, reloadBets]);

  // Bootstrap + Realtime
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) {
      if (!fallbackSimRef.current) fallbackSimRef.current = new LocalCrashSimulator();
      setUseFallback(true);
      return;
    }

    void bootstrap();

    const supabase = createClient();
    if (!supabase) {
      setUseFallback(true);
      return;
    }

    const channel = supabase
      .channel(CRASH_CHANNEL)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crash_live_state",
          filter: "id=eq.1",
        },
        (payload) => {
          lastRealtimeAtRef.current = Date.now();
          const state = liveStateRowToPublic(
            payload.new as Record<string, unknown>
          );
          if (state?.round_id) {
            applyServerState(state);
            void reloadBets(state.round_id);
          } else {
            void refreshServerState();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crash_bets",
        },
        () => {
          lastRealtimeAtRef.current = Date.now();
          void reloadBets();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true);
          setUseFallback(false);
          lastRealtimeAtRef.current = Date.now();
          void refreshServerState();
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeConnected(false);
          setUseFallback(true);
          if (!fallbackSimRef.current) {
            fallbackSimRef.current = new LocalCrashSimulator();
          }
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyServerState, bootstrap, reloadBets, refreshServerState]);

  // Poll de secours si Realtime ne pousse pas d'événement
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const id = setInterval(() => {
      if (serverStateRef.current?.round_id) return;
      void refreshServerState();
    }, STATE_POLL_MS);

    return () => clearInterval(id);
  }, [refreshServerState]);

  // Détection Realtime stale → re-fetch puis fallback local si échec
  useEffect(() => {
    if (useFallback) return;

    const id = setInterval(() => {
      if (
        lastRealtimeAtRef.current > 0 &&
        Date.now() - lastRealtimeAtRef.current > REALTIME_STALE_MS
      ) {
        void refreshServerState().then((state) => {
          if (!state) {
            setUseFallback(true);
            setRealtimeConnected(false);
            if (!fallbackSimRef.current) {
              fallbackSimRef.current = new LocalCrashSimulator();
            }
          }
        });
      }
    }, 5000);

    return () => clearInterval(id);
  }, [useFallback, refreshServerState]);

  /**
   * Boucle multijoueur côté client (pas de cron Vercel) :
   * crash_advance_tick toutes les 500ms → API /api/crash/loop si RPC échoue.
   */
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const runTick = async () => {
      if (advancingRef.current || placingBetRef.current) return;
      advancingRef.current = true;
      try {
        if (!serverStateRef.current?.round_id) {
          await refreshServerState();
        }

        const tick = await runCrashLoopTick();
        syncClockFromServer(tick.serverTimeMs);
        if (tick.errors.length) {
          setTickError(tick.errors.slice(0, 2).join(" · "));
        } else {
          setTickError(null);
        }
        if (tick.state) applyServerState(tick.state);
      } finally {
        advancingRef.current = false;
      }
    };

    void runTick();
    const id = setInterval(() => void runTick(), LOOP_TICK_MS);
    return () => clearInterval(id);
  }, [applyServerState, refreshServerState, syncClockFromServer]);

  // Rafraîchissement visuel 50ms (serveur dérivé ou simulateur local)
  useEffect(() => {
    if (!fallbackSimRef.current) {
      fallbackSimRef.current = new LocalCrashSimulator();
    }

    const id = setInterval(() => {
      if (useFallback) {
        const tick = fallbackSimRef.current!.tick();
        setPhase(tick.phase);
        setMultiplier(tick.multiplier);
        setBettingSecondsLeft(tick.bettingSecondsLeft);
        setCrashPoint(tick.crashPoint);
        setRoundNumber(tick.roundNumber);

        if (tick.phase === "flying") {
          setCurvePoints((pts) => {
            const next = [...pts, tick.multiplier];
            return next.length > 60 ? next.slice(-60) : next;
          });
        } else if (tick.justNewRound) {
          setCurvePoints([1]);
        }

        if (tick.justCrashed && tick.crashPoint != null) {
          setCrashHistory((h) => [tick.crashPoint!, ...h].slice(0, 12));
        }
        return;
      }

      const state =
        serverStateRef.current ?? lastKnownStateRef.current;
      if (!state) return;

      const visual = deriveVisualState(state, nowSynced());

      setPhase(visual.phase);
      setMultiplier(visual.multiplier);
      setBettingSecondsLeft(visual.bettingSecondsLeft);
      setCrashPoint(visual.crashPoint);

      if (visual.phase === "flying") {
        const m = visual.multiplier;
        if (m > lastCurveMRef.current) {
          lastCurveMRef.current = m;
          setCurvePoints((pts) => {
            const next = [...pts, m];
            return next.length > 60 ? next.slice(-60) : next;
          });
        }
      } else if (visual.phase === "betting") {
        lastCurveMRef.current = 1;
      }

      if (state.phase === "crashed" && state.crash_point != null) {
        setCrashHistory((h) => {
          if (h[0] === state.crash_point) return h;
          return [state.crash_point!, ...h].slice(0, 12);
        });
      }
    }, VISUAL_TICK_MS);

    return () => clearInterval(id);
  }, [useFallback, nowSynced]);

  const placeBet = useCallback(async () => {
    if (phase !== "betting" || (bettingSecondsLeft ?? 0) <= 0) return;
    if (hasPlacedBet) return;

    if (!userIdRef.current) {
      setMessage("Connecte-toi pour miser en multijoueur.");
      window.setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (balance < bet) {
      setMessage("Solde insuffisant.");
      window.setTimeout(() => setMessage(null), 2000);
      return;
    }

    const roundId = normalizeRoundId(
      roundIdRef.current ||
        serverStateRef.current?.round_id ||
        serverState?.round_id
    );
    if (!roundId) {
      setMessage("Manche non synchronisée — attente du round_id…");
      void refreshServerState();
      window.setTimeout(() => setMessage(null), 2500);
      return;
    }

    placingBetRef.current = true;
    try {
      const { ok, balance: newBal, error } = await placeCrashBet(bet, roundId);
      if (ok) {
        if (newBal != null) setBalanceTracked(newBal);
        setHasPlacedBet(true);
        setMessage(`Mise ${bet} jetons enregistrée`);
        void reloadBets();
      } else {
        setMessage(error ?? "Mise refusée");
      }
      window.setTimeout(() => setMessage(null), 2000);
    } finally {
      placingBetRef.current = false;
    }
  }, [
    phase,
    bettingSecondsLeft,
    hasPlacedBet,
    balance,
    bet,
    serverState,
    setBalanceTracked,
    reloadBets,
    refreshServerState,
  ]);

  const cashout = useCallback(async () => {
    if (phase !== "flying" || !hasPlacedBet || hasCashedOut) return;

    const roundId =
      roundIdRef.current ||
      serverStateRef.current?.round_id ||
      serverState?.round_id ||
      "";
    const serverNow = await fetchCrashServerNowMs();
    syncClockFromServer(serverNow);

    const liveState = serverStateRef.current ?? lastKnownStateRef.current;
    const cashoutMultiplier = liveState
      ? deriveVisualState(liveState, nowSynced()).multiplier
      : multiplier;

    const { ok, balance: newBal, payout, error } = await cashoutCrash(
      cashoutMultiplier,
      roundId
    );
    if (ok) {
      if (newBal != null) setBalanceTracked(newBal);
      setHasCashedOut(true);
      setMessage(
        payout != null ? `Cashout +${payout} jetons` : "Cashout réussi"
      );
      void reloadBets();
    } else {
      setMessage(error ?? "Cashout impossible");
    }
    window.setTimeout(() => setMessage(null), 2000);
  }, [
    phase,
    hasPlacedBet,
    hasCashedOut,
    multiplier,
    nowSynced,
    syncClockFromServer,
    setBalanceTracked,
    reloadBets,
  ]);

  const changeBet = useCallback(
    (delta: number) => {
      if (hasPlacedBet) return;
      const idx = CRASH_BET_OPTIONS.indexOf(
        bet as (typeof CRASH_BET_OPTIONS)[number]
      );
      const next = Math.max(
        0,
        Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
      );
      setBet(CRASH_BET_OPTIONS[next]);
    },
    [bet, hasPlacedBet]
  );

  const activePlayersCount = roundBets.filter((b) => b.status === "active").length;
  const myBet = userId
    ? roundBets.find((b) => b.user_id === userId)
    : undefined;
  const activeBet = myBet?.bet_amount ?? 0;

  const hasLiveRound = Boolean(
    serverState?.round_id || roundIdRef.current
  );
  const multiplayerLive = hasLiveRound && !useFallback;
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
      (bettingSecondsLeft ?? 0) > 0 &&
      !hasPlacedBet &&
      balance >= bet &&
      !!userId,
    canCashout: phase === "flying" && hasPlacedBet && !hasCashedOut,
    potentialWin: Math.floor((activeBet || bet) * multiplier),
    bettingSecondsLeft,
    chronoReady:
      useFallback ||
      (hasLiveRound &&
        serverState !== null &&
        !deriveVisualState(serverState, nowSynced()).awaitingServerSync),
    roundBets,
    presence: [],
    activePlayersCount: Math.max(activePlayersCount, roundBets.length > 0 ? roundBets.length : 0),
    hasPlacedBet,
    hasCashedOut,
    connected: multiplayerLive,
    roundNumber,
    profileLoading: false,
    isSyncing,
    profileError,
    tickError,
    isDemoMode: demo,
    useFallback,
    placeBet,
    cashout,
    changeBet,
  };
}
