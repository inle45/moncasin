"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  crashStateSignature,
  runCrashLoopTick,
} from "@/utils/crash/advance-client";
import { CRASH_BET_OPTIONS } from "@/utils/crash/constants";
import {
  computeClockOffsetMs,
  postgresNowFromAnchor,
} from "@/utils/crash/client-clock";
import {
  createDefaultBetSlots,
  parseAutoCashoutTarget,
  type CrashBetSlotIndex,
  type CrashBetSlotUI,
} from "@/utils/crash/bet-slot";
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
/** Resync horloge Postgres (jamais Vercel / Date.now serveur). */
const POSTGRES_CLOCK_RESYNC_MS = 300;
const REALTIME_STALE_MS = 30_000;
const STATE_POLL_MS = 3_000;

export function useCrashGame() {
  const serverStateRef = useRef<CrashPublicState | null>(null);
  const roundIdRef = useRef("");
  const userIdRef = useRef<string | null>(null);
  const fallbackSimRef = useRef<LocalCrashSimulator | null>(null);
  const advancingRef = useRef(false);
  const placingBetRef = useRef(false);
  const autoCashoutInFlightRef = useRef<[boolean, boolean]>([false, false]);
  const betSlotsRef = useRef<[CrashBetSlotUI, CrashBetSlotUI]>(createDefaultBetSlots());
  const phaseRef = useRef<CrashPhase>("betting");
  const cashoutForSlotRef = useRef<
    (slotIndex: CrashBetSlotIndex) => Promise<boolean>
  >(async () => false);
  const checkAutoCashoutsRef = useRef<(currentMultiplier: number) => void>(
    () => {}
  );
  const prevPhaseRef = useRef<CrashPhase>("betting");
  const lastRealtimeAtRef = useRef(0);
  const lastCurveMRef = useRef(1);
  const lastKnownStateRef = useRef<CrashPublicState | null>(null);
  const postgresAnchorMsRef = useRef<number | null>(null);
  const clientAnchorMsRef = useRef(0);
  const clockOffsetRef = useRef(0);
  const postgresClockSyncedRef = useRef(false);

  const syncClockFromPostgres = useCallback(
    (serverTimeMs: number | null | undefined) => {
      if (serverTimeMs == null || !Number.isFinite(serverTimeMs)) return;
      const clientNow = Date.now();
      postgresAnchorMsRef.current = serverTimeMs;
      clientAnchorMsRef.current = clientNow;
      clockOffsetRef.current = computeClockOffsetMs(serverTimeMs, clientNow);
      postgresClockSyncedRef.current = true;
    },
    []
  );

  const nowSynced = useCallback(() => {
    const anchor = postgresAnchorMsRef.current;
    if (anchor == null) return Date.now();
    return postgresNowFromAnchor(anchor, clientAnchorMsRef.current);
  }, []);

  const visualStateOptions = useCallback(
    () => ({
      postgresClockSynced: postgresClockSyncedRef.current,
      offsetMs: clockOffsetRef.current,
    }),
    []
  );

  const [serverState, setServerState] = useState<CrashPublicState | null>(null);
  const [useFallback, setUseFallback] = useState(!isSupabaseConfigured());
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [betSlots, setBetSlots] =
    useState<[CrashBetSlotUI, CrashBetSlotUI]>(createDefaultBetSlots);
  const [crashFlash, setCrashFlash] = useState(false);
  const [phase, setPhase] = useState<CrashPhase>("betting");
  betSlotsRef.current = betSlots;
  phaseRef.current = phase;
  const [multiplier, setMultiplier] = useState(1);
  const [bettingSecondsLeft, setBettingSecondsLeft] = useState<number | null>(5);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [roundBets, setRoundBets] = useState<CrashBetRow[]>([]);
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
      setBetSlots(createDefaultBetSlots());
      autoCashoutInFlightRef.current = [false, false];
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

    const mine = bets
      .filter((b) => b.user_id === uid)
      .sort((a, b) => (a.bet_slot ?? 0) - (b.bet_slot ?? 0));

    setBetSlots((prev) => {
      const next = createDefaultBetSlots();
      next[0] = { ...prev[0], ...next[0] };
      next[1] = { ...prev[1], ...next[1] };

      mine.forEach((row, idx) => {
        const slot = Math.min(1, row.bet_slot ?? idx) as CrashBetSlotIndex;
        next[slot] = {
          ...next[slot],
          betAmount: row.bet_amount,
          lockedBetAmount: row.bet_amount,
          hasPlacedBet: true,
          hasCashedOut: row.status === "cashed_out",
          betId: row.id,
        };
      });
      return next;
    });
  }, []);

  const refreshServerState = useCallback(async () => {
    const [table, serverNow] = await Promise.all([
      fetchCrashStateFromTable(),
      fetchCrashServerNowMs(),
    ]);
    syncClockFromPostgres(serverNow);
    if (table.data) {
      applyServerState(table.data);
      await reloadBets(table.data.round_id);
      return table.data;
    }
    if (table.error) setProfileError(table.error);
    return null;
  }, [applyServerState, reloadBets, syncClockFromPostgres]);

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
    syncClockFromPostgres(serverNow);

    if (points.length) setCrashHistory(points);

    if (state?.round_id) {
      applyServerState(state);
      await reloadBets(state.round_id);
    } else if (state) {
      const tick = await runCrashLoopTick();
      syncClockFromPostgres(tick.serverTimeMs);
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
  }, [applyServerState, reloadBets, refreshServerState, syncClockFromPostgres]);

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
        setBetSlots(createDefaultBetSlots());
        autoCashoutInFlightRef.current = [false, false];
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
        syncClockFromPostgres(tick.serverTimeMs);
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
  }, [applyServerState, refreshServerState, syncClockFromPostgres]);

  // Horloge Postgres dédiée (indépendante de Vercel et de l'offset ≈ 0 navigateur/Vercel)
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode() || useFallback) return;

    let cancelled = false;
    const resync = async () => {
      const ms = await fetchCrashServerNowMs();
      if (!cancelled) syncClockFromPostgres(ms);
    };

    void resync();
    const id = setInterval(() => void resync(), POSTGRES_CLOCK_RESYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [useFallback, syncClockFromPostgres]);

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
          checkAutoCashoutsRef.current(tick.multiplier);
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

      if (
        state.phase === "crashed" &&
        prevPhaseRef.current === "flying"
      ) {
        setCrashFlash(true);
        window.setTimeout(() => setCrashFlash(false), 500);
      }
      prevPhaseRef.current = state.phase;

      const visual = deriveVisualState(state, nowSynced(), visualStateOptions());

      setPhase(visual.phase);
      setMultiplier(visual.multiplier);
      setBettingSecondsLeft(visual.bettingSecondsLeft);
      setCrashPoint(visual.crashPoint);

      if (visual.phase === "flying") {
        const m = visual.multiplier;
        checkAutoCashoutsRef.current(m);
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
  }, [useFallback, nowSynced, visualStateOptions]);

  const getSyncedMultiplier = useCallback(() => {
    const liveState = serverStateRef.current ?? lastKnownStateRef.current;
    if (!liveState) return multiplier;
    return deriveVisualState(liveState, nowSynced(), visualStateOptions())
      .multiplier;
  }, [multiplier, nowSynced, visualStateOptions]);

  const placeBetForSlot = useCallback(
    async (slotIndex: CrashBetSlotIndex) => {
      const slot = betSlots[slotIndex];
      if (phase !== "betting" || (bettingSecondsLeft ?? 0) <= 0) return;
      if (slot.hasPlacedBet) return;

      const amount = slot.betAmount;

      if (useFallback || isDemoMode()) {
        if (balance < amount) {
          setMessage("Solde insuffisant.");
          window.setTimeout(() => setMessage(null), 2000);
          return;
        }
        setBalanceTracked(balance - amount);
        setBetSlots((prev) => {
          const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
            CrashBetSlotUI,
            CrashBetSlotUI,
          ];
          next[slotIndex] = {
            ...next[slotIndex],
            hasPlacedBet: true,
            lockedBetAmount: amount,
          };
          return next;
        });
        setMessage(`Mise ${slotIndex + 1} : ${amount} jetons`);
        window.setTimeout(() => setMessage(null), 2000);
        return;
      }

      if (!userIdRef.current) {
        setMessage("Connecte-toi pour miser en multijoueur.");
        window.setTimeout(() => setMessage(null), 2500);
        return;
      }

      if (balance < amount) {
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
        const { ok, balance: newBal, betId, error } = await placeCrashBet(
          amount,
          roundId,
          slotIndex
        );
        if (ok) {
          if (newBal != null) setBalanceTracked(newBal);
          setBetSlots((prev) => {
            const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
              CrashBetSlotUI,
              CrashBetSlotUI,
            ];
            next[slotIndex] = {
              ...next[slotIndex],
              hasPlacedBet: true,
              lockedBetAmount: amount,
              betId: betId ?? null,
            };
            return next;
          });
          setMessage(`Mise ${slotIndex + 1} : ${amount} jetons`);
          void reloadBets();
        } else {
          setMessage(error ?? "Mise refusée");
        }
        window.setTimeout(() => setMessage(null), 2000);
      } finally {
        placingBetRef.current = false;
      }
    },
    [
      betSlots,
      phase,
      bettingSecondsLeft,
      balance,
      useFallback,
      serverState,
      setBalanceTracked,
      reloadBets,
      refreshServerState,
    ]
  );

  const cashoutForSlot = useCallback(
    async (slotIndex: CrashBetSlotIndex): Promise<boolean> => {
      const slot = betSlotsRef.current[slotIndex];
      if (
        phaseRef.current !== "flying" ||
        !slot.hasPlacedBet ||
        slot.hasCashedOut
      ) {
        return false;
      }

      const roundId =
        roundIdRef.current ||
        serverStateRef.current?.round_id ||
        serverState?.round_id ||
        "";

      const serverNow = await fetchCrashServerNowMs();
      syncClockFromPostgres(serverNow);
      const cashoutMultiplier = getSyncedMultiplier();

      if (useFallback || isDemoMode()) {
        const payout = Math.floor(
          (slot.lockedBetAmount || slot.betAmount) * cashoutMultiplier
        );
        setBalance((b) => Math.max(0, Math.floor(b + payout)));
        setBetSlots((prev) => {
          const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
            CrashBetSlotUI,
            CrashBetSlotUI,
          ];
          next[slotIndex] = { ...next[slotIndex], hasCashedOut: true };
          return next;
        });
        setMessage(`Cashout ${slotIndex + 1} +${payout} jetons`);
        window.setTimeout(() => setMessage(null), 2000);
        return true;
      }

      const { ok, balance: newBal, payout, error } = await cashoutCrash(
        cashoutMultiplier,
        roundId,
        slot.betId ?? undefined
      );
      if (ok) {
        if (newBal != null) setBalanceTracked(newBal);
        setBetSlots((prev) => {
          const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
            CrashBetSlotUI,
            CrashBetSlotUI,
          ];
          next[slotIndex] = { ...next[slotIndex], hasCashedOut: true };
          return next;
        });
        setMessage(
          payout != null
            ? `Cashout ${slotIndex + 1} +${payout} jetons`
            : "Cashout réussi"
        );
        void reloadBets();
        window.setTimeout(() => setMessage(null), 2000);
        return true;
      }

      setMessage(error ?? "Cashout impossible");
      window.setTimeout(() => setMessage(null), 2000);
      return false;
    },
    [
      betSlots,
      phase,
      balance,
      useFallback,
      getSyncedMultiplier,
      syncClockFromPostgres,
      setBalanceTracked,
      reloadBets,
      serverState,
    ]
  );

  const changeBetForSlot = useCallback(
    (slotIndex: CrashBetSlotIndex, delta: number) => {
      setBetSlots((prev) => {
        const slot = prev[slotIndex];
        if (slot.hasPlacedBet) return prev;
        const idx = CRASH_BET_OPTIONS.indexOf(
          slot.betAmount as (typeof CRASH_BET_OPTIONS)[number]
        );
        const nextIdx = Math.max(
          0,
          Math.min(CRASH_BET_OPTIONS.length - 1, idx + delta)
        );
        const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
          CrashBetSlotUI,
          CrashBetSlotUI,
        ];
        next[slotIndex] = {
          ...slot,
          betAmount: CRASH_BET_OPTIONS[nextIdx],
        };
        return next;
      });
    },
    []
  );

  const setAutoCashoutForSlot = useCallback(
    (slotIndex: CrashBetSlotIndex, value: string) => {
      setBetSlots((prev) => {
        const next: [CrashBetSlotUI, CrashBetSlotUI] = [...prev] as [
          CrashBetSlotUI,
          CrashBetSlotUI,
        ];
        next[slotIndex] = { ...next[slotIndex], autoCashoutInput: value };
        return next;
      });
    },
    []
  );

  cashoutForSlotRef.current = cashoutForSlot;

  checkAutoCashoutsRef.current = (currentMultiplier: number) => {
    if (phaseRef.current !== "flying") return;

    const currentMult = parseFloat(String(currentMultiplier));
    if (!Number.isFinite(currentMult)) return;
    const m = Math.round(currentMult * 100) / 100;

    ([0, 1] as const).forEach((slotIndex) => {
      const slot = betSlotsRef.current[slotIndex];
      if (!slot.hasPlacedBet || slot.hasCashedOut) return;

      const target = parseAutoCashoutTarget(slot.autoCashoutInput);
      if (target == null) return;
      if (m < target) return;
      if (autoCashoutInFlightRef.current[slotIndex]) return;

      autoCashoutInFlightRef.current[slotIndex] = true;
      void cashoutForSlotRef.current(slotIndex).finally(() => {
        autoCashoutInFlightRef.current[slotIndex] = false;
      });
    });
  };

  const activePlayersCount = roundBets.filter((b) => b.status === "active").length;

  const canPlaceBetForSlot = useCallback(
    (slotIndex: CrashBetSlotIndex) =>
      phase === "betting" &&
      (bettingSecondsLeft ?? 0) > 0 &&
      !betSlots[slotIndex].hasPlacedBet &&
      balance >= betSlots[slotIndex].betAmount &&
      (!!userId || useFallback || isDemoMode()),
    [phase, bettingSecondsLeft, betSlots, balance, userId, useFallback]
  );

  const canCashoutForSlot = useCallback(
    (slotIndex: CrashBetSlotIndex) =>
      phase === "flying" &&
      betSlots[slotIndex].hasPlacedBet &&
      !betSlots[slotIndex].hasCashedOut,
    [phase, betSlots]
  );

  const hasLiveRound = Boolean(
    serverState?.round_id || roundIdRef.current
  );
  const multiplayerLive = hasLiveRound && !useFallback;
  const demo = isDemoMode() || !userId;

  const totalActiveBet = betSlots.reduce(
    (sum, s) => sum + (s.hasPlacedBet && !s.hasCashedOut ? s.lockedBetAmount || s.betAmount : 0),
    0
  );

  return {
    balance,
    betSlots,
    phase,
    multiplier,
    activeBet: totalActiveBet,
    crashPoint,
    message,
    crashHistory,
    curvePoints,
    crashFlash,
    bettingSecondsLeft,
    chronoReady:
      useFallback ||
      (hasLiveRound &&
        serverState !== null &&
        !deriveVisualState(serverState, nowSynced(), visualStateOptions())
          .awaitingServerSync),
    roundBets,
    presence: [],
    activePlayersCount: Math.max(
      activePlayersCount,
      roundBets.length > 0 ? roundBets.length : 0
    ),
    connected: multiplayerLive,
    roundNumber,
    profileLoading: false,
    isSyncing,
    profileError,
    tickError,
    isDemoMode: demo,
    useFallback,
    canPlaceBetForSlot,
    canCashoutForSlot,
    placeBetForSlot,
    cashoutForSlot,
    changeBetForSlot,
    setAutoCashoutForSlot,
  };
}
