"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { advanceCrashFromClient } from "@/utils/crash/advance-client";
import {
  CRASH_BET_OPTIONS,
  DEFAULT_CRASH_BET,
} from "@/utils/crash/constants";
import {
  deriveVisualState,
  serverStateNeedsAdvance,
} from "@/utils/crash/visual-state";
import { liveStateRowToPublic } from "@/utils/crash/live-state";
import {
  LocalCrashSimulator,
  LOCAL_CRASH_TICK_MS,
} from "@/utils/crash/local-simulator";
import { createFallbackCrashState } from "@/utils/crash/default-state";
import type { CrashBetRow, CrashPhase, CrashPublicState } from "@/utils/crash/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode, isSupabaseConfigured } from "@/utils/supabase/config";
import {
  CRASH_CHANNEL,
  cashoutCrash,
  fetchCrashHistory,
  fetchCrashState,
  fetchRoundBets,
  placeCrashBet,
} from "@/utils/supabase/crash-room";
import { fetchProfile } from "@/utils/supabase/profiles";

export type { CrashPhase };

const TICK_PILOT_MS = 450;
const VISUAL_TICK_MS = 50;
const REALTIME_STALE_MS = 12_000;

export function useCrashGame() {
  const serverStateRef = useRef<CrashPublicState | null>(null);
  const roundIdRef = useRef("");
  const userIdRef = useRef<string | null>(null);
  const fallbackSimRef = useRef<LocalCrashSimulator | null>(null);
  const advancingRef = useRef(false);
  const lastRealtimeAtRef = useRef(0);
  const lastCurveMRef = useRef(1);

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

  const setBalanceTracked = useCallback((next: number) => {
    setBalance(Math.max(0, Math.floor(next)));
  }, []);

  const applyServerState = useCallback((state: CrashPublicState) => {
    const prevRound = roundIdRef.current;
    serverStateRef.current = state;
    setServerState(state);
    setRoundNumber(state.round_number);

    if (state.round_id && state.round_id !== prevRound) {
      roundIdRef.current = state.round_id;
      lastCurveMRef.current = 1;
      setCurvePoints([1]);
      setHasPlacedBet(false);
      setHasCashedOut(false);
    } else if (!roundIdRef.current && state.round_id) {
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

  const bootstrap = useCallback(async () => {
    if (!isSupabaseConfigured() || isDemoMode()) {
      setUseFallback(true);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const [{ data: state, error }, { points }] = await Promise.all([
      fetchCrashState(),
      fetchCrashHistory(12),
    ]);

    if (points.length) setCrashHistory(points);

    if (state) {
      applyServerState(state);
      roundIdRef.current = state.round_id;
      lastRealtimeAtRef.current = Date.now();
      await reloadBets(state.round_id);

      if (serverStateNeedsAdvance(state)) {
        const advanced = await advanceCrashFromClient();
        if (advanced) {
          applyServerState(advanced);
          lastRealtimeAtRef.current = Date.now();
        }
      }
    } else if (error) {
      setUseFallback(true);
      setProfileError(error);
    }

    setIsSyncing(false);
  }, [applyServerState, reloadBets]);

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
          if (state) {
            applyServerState(state);
            setUseFallback(false);
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
  }, [applyServerState, bootstrap, reloadBets]);

  // Détection Realtime stale → fallback local fluide
  useEffect(() => {
    if (useFallback) return;

    const id = setInterval(() => {
      if (
        lastRealtimeAtRef.current > 0 &&
        Date.now() - lastRealtimeAtRef.current > REALTIME_STALE_MS
      ) {
        setUseFallback(true);
        setRealtimeConnected(false);
        if (!fallbackSimRef.current) {
          fallbackSimRef.current = new LocalCrashSimulator();
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, [useFallback]);

  // Pilote de boucle : le client actif avance la manche si elle est expirée
  useEffect(() => {
    if (useFallback || !isSupabaseConfigured() || isDemoMode()) return;

    const id = setInterval(() => {
      const state = serverStateRef.current;
      if (!state || !serverStateNeedsAdvance(state)) return;
      if (advancingRef.current) return;

      advancingRef.current = true;
      void advanceCrashFromClient()
        .then((next) => {
          if (next) {
            applyServerState(next);
            lastRealtimeAtRef.current = Date.now();
          }
        })
        .finally(() => {
          advancingRef.current = false;
        });
    }, TICK_PILOT_MS);

    return () => clearInterval(id);
  }, [useFallback, applyServerState]);

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

      const state = serverStateRef.current ?? createFallbackCrashState();
      const visual = deriveVisualState(state, Date.now());

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
  }, [useFallback]);

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

    const { ok, balance: newBal, error } = await placeCrashBet(bet);
    if (ok) {
      if (newBal != null) setBalanceTracked(newBal);
      setHasPlacedBet(true);
      setMessage(`Mise ${bet} jetons enregistrée`);
      void reloadBets();
    } else {
      setMessage(error ?? "Mise refusée");
    }
    window.setTimeout(() => setMessage(null), 2000);
  }, [phase, bettingSecondsLeft, hasPlacedBet, balance, bet, setBalanceTracked, reloadBets]);

  const cashout = useCallback(async () => {
    if (phase !== "flying" || !hasPlacedBet || hasCashedOut) return;

    const { ok, balance: newBal, payout, error } = await cashoutCrash(multiplier);
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
  }, [phase, hasPlacedBet, hasCashedOut, multiplier, setBalanceTracked, reloadBets]);

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

  const multiplayerLive = realtimeConnected && !useFallback && !!serverState;
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
      (serverState !== null &&
        !deriveVisualState(serverState, Date.now()).awaitingServerSync),
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
    isDemoMode: demo,
    useFallback,
    placeBet,
    cashout,
    changeBet,
  };
}
