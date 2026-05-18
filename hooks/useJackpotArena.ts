"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runJackpotLoopTick } from "@/utils/jackpot/advance-client";
import {
  aggregateBetsByUser,
  computeCountdownSeconds,
  getRollingAnimationRemainingMs,
  isCountdownExpired,
} from "@/utils/jackpot/bets";
import {
  JACKPOT_ENDED_DISPLAY_MS,
  JACKPOT_LOOP_TICK_MS,
  JACKPOT_MIN_BET,
  JACKPOT_ROLLING_MS,
  JACKPOT_STATE_POLL_MS,
  JACKPOT_STUCK_ROLL_MS,
  JACKPOT_STUCK_ROLLING_MS,
} from "@/utils/jackpot/constants";
import { parseJackpotBet, parseJackpotRound } from "@/utils/jackpot/parse";
import { buildPotSegments } from "@/utils/jackpot/segments";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode, isSupabaseConfigured } from "@/utils/supabase/config";
import {
  JACKPOT_CHANNEL,
  completeJackpotRound,
  enterJackpotArena,
  fetchActiveJackpotRound,
  fetchJackpotBets,
  finalizeJackpotRound,
  triggerJackpotRoll,
} from "@/utils/supabase/jackpot-room";
import { fetchProfile } from "@/utils/supabase/profiles";

function mergeBet(
  prev: JackpotBetRow[],
  incoming: JackpotBetRow
): JackpotBetRow[] {
  const idx = prev.findIndex(
    (b) => b.id === incoming.id || b.user_id === incoming.user_id
  );
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = incoming;
    return next;
  }
  return [...prev, incoming].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

function formatRollError(
  error: string | null,
  sqlMessage?: string | null,
  debug?: {
    postgrestCode?: string;
    postgrestHint?: string;
    postgrestMessage?: string;
    rawData?: unknown;
    step?: string;
  }
): string {
  const primary =
    sqlMessage?.trim() ||
    error?.trim() ||
    debug?.postgrestMessage?.trim() ||
    "Tirage impossible (aucun détail serveur)";

  const code = debug?.postgrestCode ? ` [${debug.postgrestCode}]` : "";
  const hint = debug?.postgrestHint ? ` — ${debug.postgrestHint}` : "";
  const step = debug?.step ? ` (${debug.step})` : "";

  let rawSnippet = "";
  if (debug?.rawData != null) {
    try {
      const raw =
        typeof debug.rawData === "string"
          ? debug.rawData
          : JSON.stringify(debug.rawData);
      if (raw && raw !== "{}") {
        rawSnippet = ` · Réponse: ${raw.length > 280 ? `${raw.slice(0, 280)}…` : raw}`;
      }
    } catch {
      rawSnippet = ` · Réponse: ${String(debug.rawData).slice(0, 200)}`;
    }
  }

  return `${primary}${code}${hint}${step}${rawSnippet}`;
}

export function useJackpotArena() {
  const roundRef = useRef<JackpotRound | null>(null);
  const betsRef = useRef<JackpotBetRow[]>([]);
  const userIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const submittingRef = useRef(false);
  const hasPlacedBetRef = useRef(false);
  const rollTriggeredForRoundRef = useRef<string | null>(null);
  const triggeringRollRef = useRef(false);
  const stuckRollSinceRef = useRef<number | null>(null);
  const lastTriggerErrorRef = useRef<string | null>(null);
  const completingRoundRef = useRef(false);
  const finalizeScheduledRef = useRef<string | null>(null);
  const rollingWatchdogSinceRef = useRef<number | null>(null);

  const [round, setRound] = useState<JackpotRound | null>(null);
  const [bets, setBets] = useState<JackpotBetRow[]>([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [userId, setUserId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);
  const [criticalError, setCriticalError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(isSupabaseConfigured());
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showWinnerFlash, setShowWinnerFlash] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPlacedBet, setHasPlacedBet] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const prevRoundIdRef = useRef<string | null>(null);

  roundRef.current = round;
  betsRef.current = bets;
  hasPlacedBetRef.current = hasPlacedBet;

  const setBetsAggregated = useCallback((rows: JackpotBetRow[]) => {
    const aggregated = aggregateBetsByUser(rows);
    betsRef.current = aggregated;
    setBets(aggregated);
  }, []);

  const applyRound = useCallback((next: JackpotRound | null) => {
    if (!next) return;

    const prevStatus = prevStatusRef.current;
    const prevRoundId = prevRoundIdRef.current;
    prevStatusRef.current = next.status;
    prevRoundIdRef.current = next.id;

    if (prevRoundId && prevRoundId !== next.id) {
      setShowWinnerFlash(false);
      setBets([]);
      betsRef.current = [];
      setHasPlacedBet(false);
      hasPlacedBetRef.current = false;
      rollTriggeredForRoundRef.current = null;
      setCriticalError(null);
    }

    if (next.status === "waiting" && prevRoundId && prevRoundId !== next.id) {
      setBets([]);
      betsRef.current = [];
      setHasPlacedBet(false);
      hasPlacedBetRef.current = false;
      rollTriggeredForRoundRef.current = null;
      finalizeScheduledRef.current = null;
    }

    if (next.status === "rolling" || next.status === "ended") {
      rollTriggeredForRoundRef.current = next.id;
      triggeringRollRef.current = false;
      setCriticalError(null);
      setCountdownSeconds(null);
      stuckRollSinceRef.current = null;
      lastTriggerErrorRef.current = null;
      rollingWatchdogSinceRef.current = null;
    }

    if (next.status === "ended" && prevStatus !== "ended") {
      setShowWinnerFlash(true);
      window.setTimeout(() => setShowWinnerFlash(false), JACKPOT_ENDED_DISPLAY_MS);
    }

    const merged: JackpotRound =
      roundRef.current?.id === next.id
        ? { ...roundRef.current, ...next }
        : next;

    roundRef.current = merged;
    setRound(merged);
  }, []);

  const reloadBets = useCallback(
    async (roundId?: string): Promise<{ count: number; error: string | null }> => {
      const rid = roundId ?? roundRef.current?.id;
      if (!rid) return { count: 0, error: null };

      const { bets: rows, error } = await fetchJackpotBets(rid);
      if (error) {
        console.warn("[MonCasin Jackpot] reloadBets:", error, { roundId: rid });
        return { count: betsRef.current.length, error };
      }

      setBetsAggregated(rows);
      return { count: aggregateBetsByUser(rows).length, error: null };
    },
    [setBetsAggregated]
  );

  const refreshState = useCallback(async () => {
    const { data, error } = await fetchActiveJackpotRound();
    if (error) {
      console.warn("[MonCasin Jackpot] refreshState:", error);
      return null;
    }
    if (data) {
      applyRound(data);
      await reloadBets(data.id);
    }
    return data;
  }, [applyRound, reloadBets]);

  const syncBalance = useCallback(async (uid?: string | null) => {
    const id = uid ?? userIdRef.current;
    if (!id) return;
    const { profile } = await fetchProfile(id);
    if (profile) setBalance(Math.floor(Number(profile.balance)));
  }, []);

  const bootstrap = useCallback(async () => {
    if (!isSupabaseConfigured() || isDemoMode()) {
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    const supabase = createClient();
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      setUserId(uid);
      if (uid) await syncBalance(uid);
    }

    await refreshState();
    setIsSyncing(false);
  }, [refreshState, syncBalance]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /** Rafraîchit l'état au retour sur l'onglet (cache mobile / PWA). */
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshState();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshState]);

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`${JACKPOT_CHANNEL}:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_rounds" },
        (payload) => {
          const row =
            payload.eventType === "DELETE"
              ? (payload.old as Record<string, unknown> | undefined)
              : (payload.new as Record<string, unknown> | undefined);

          if (!row?.id) {
            void refreshState();
            return;
          }

          const parsed = parseJackpotRound(row);
          if (!parsed) {
            void refreshState();
            return;
          }

          applyRound(parsed);

          if (parsed.status === "rolling") {
            rollTriggeredForRoundRef.current = parsed.id;
            triggeringRollRef.current = false;
          }

          if (parsed.status === "ended") {
            void reloadBets(parsed.id);
            if (parsed.winner_id === userIdRef.current) {
              void syncBalance();
            }
          }

          if (payload.eventType !== "DELETE") {
            void reloadBets(parsed.id);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_bets" },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const bet = parseJackpotBet(payload.new as Record<string, unknown>);
            if (bet) {
              const rid = roundRef.current?.id;
              if (!rid || bet.round_id === rid || !bet.round_id) {
                setBets((prev) =>
                  aggregateBetsByUser(mergeBet(prev, bet))
                );
              }
            }
          }

          const betRow =
            (payload.new as Record<string, unknown> | undefined) ??
            (payload.old as Record<string, unknown> | undefined);
          const betRoundId = betRow?.round_id
            ? String(betRow.round_id)
            : roundRef.current?.id;

          if (betRoundId) void reloadBets(betRoundId);
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("[jackpot realtime]", err);
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void refreshState();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyRound, refreshState, reloadBets]);

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const pollId = setInterval(() => {
      const status = roundRef.current?.status;
      if (status === "rolling" || status === "ended") return;
      void refreshState();
    }, JACKPOT_STATE_POLL_MS);

    const runTick = async () => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        const tick = await runJackpotLoopTick();
        if (tick.round) {
          applyRound(tick.round);
          if (tick.bets.length) {
            setBetsAggregated(tick.bets);
          } else if (tick.round.id) {
            await reloadBets(tick.round.id);
          }
        }
        if (
          tick.round?.status === "ended" &&
          tick.round.winner_id === userIdRef.current
        ) {
          await syncBalance();
        }
      } finally {
        advancingRef.current = false;
      }
    };

    void runTick();
    const tickId = setInterval(() => void runTick(), JACKPOT_LOOP_TICK_MS);

    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [applyRound, refreshState, reloadBets, setBetsAggregated, syncBalance]);

  useEffect(() => {
    if (round?.status !== "counting") {
      setCountdownSeconds(null);
      return;
    }

    const tick = () => {
      setCountdownSeconds(computeCountdownSeconds(roundRef.current));
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [
    round?.id,
    round?.status,
    round?.started_at,
    round?.counting_ends_at,
  ]);

  const resetArenaForNewRound = useCallback(() => {
    setBets([]);
    betsRef.current = [];
    setHasPlacedBet(false);
    hasPlacedBetRef.current = false;
    rollTriggeredForRoundRef.current = null;
    finalizeScheduledRef.current = null;
    completingRoundRef.current = false;
  }, []);

  const scheduleFinalizeNewRound = useCallback(
    (endedRoundId: string) => {
      if (finalizeScheduledRef.current === endedRoundId) return;
      finalizeScheduledRef.current = endedRoundId;

      window.setTimeout(() => {
        void (async () => {
          const fin = await finalizeJackpotRound();
          if (fin.round) {
            applyRound(fin.round);
            if (fin.round.status === "waiting") {
              resetArenaForNewRound();
              await reloadBets(fin.round.id);
            }
          } else {
            await refreshState();
          }
          finalizeScheduledRef.current = null;
        })();
      }, JACKPOT_ENDED_DISPLAY_MS);
    },
    [applyRound, refreshState, reloadBets, resetArenaForNewRound]
  );

  const completeRoundAfterRoll = useCallback(async () => {
    const r = roundRef.current;
    if (!r || r.status !== "rolling" || completingRoundRef.current) return;

    completingRoundRef.current = true;
    try {
      const result = await completeJackpotRound(r.id);

      if (!result.ok) {
        const errMsg = result.sqlMessage ?? result.error ?? "Clôture impossible";
        lastTriggerErrorRef.current = errMsg;
        setCriticalError(errMsg);
        console.error("ERREUR CRITIQUE JACKPOT (complete):", result);
        return;
      }

      if (result.round) {
        applyRound(result.round);

        if (result.round.status === "ended") {
          await reloadBets(result.round.id);
          if (result.round.winner_id === userIdRef.current) {
            await syncBalance();
          }
          scheduleFinalizeNewRound(result.round.id);
        } else if (result.round.status === "waiting") {
          resetArenaForNewRound();
          await reloadBets(result.round.id);
        } else {
          await refreshState();
        }
      }
    } finally {
      completingRoundRef.current = false;
    }
  }, [
    applyRound,
    reloadBets,
    refreshState,
    scheduleFinalizeNewRound,
    resetArenaForNewRound,
    syncBalance,
  ]);

  const roundStatus = round?.status ?? "waiting";
  const countdownExpired = isCountdownExpired(round, countdownSeconds);

  /** Après écran vainqueur : ended → waiting (nouvelle manche). */
  useEffect(() => {
    if (roundStatus !== "ended" || !round?.id) return;
    scheduleFinalizeNewRound(round.id);
  }, [roundStatus, round?.id, scheduleFinalizeNewRound]);

  /** Clôture rolling → ended après l'animation (callback strip + timer serveur). */
  useEffect(() => {
    if (roundStatus !== "rolling" || !round?.id) return;

    if (!rollingWatchdogSinceRef.current) {
      rollingWatchdogSinceRef.current = Date.now();
    }

    const remaining = getRollingAnimationRemainingMs(round);
    const delay =
      remaining != null
        ? Math.max(200, remaining + 150)
        : JACKPOT_ROLLING_MS;

    const animationTimer = window.setTimeout(() => {
      void completeRoundAfterRoll();
    }, delay);

    const watchdogTimer = window.setTimeout(() => {
      if (roundRef.current?.status === "rolling") {
        void completeRoundAfterRoll();
      }
    }, JACKPOT_STUCK_ROLLING_MS);

    return () => {
      window.clearTimeout(animationTimer);
      window.clearTimeout(watchdogTimer);
    };
  }, [roundStatus, round?.id, round?.rolling_started_at, completeRoundAfterRoll]);

  useEffect(() => {
    if (roundStatus !== "rolling" && roundStatus !== "ended") {
      rollingWatchdogSinceRef.current = null;
    }
  }, [roundStatus]);

  useEffect(() => {
    if (roundStatus === "counting" && countdownExpired) {
      if (!stuckRollSinceRef.current) {
        stuckRollSinceRef.current = Date.now();
      }
    } else {
      stuckRollSinceRef.current = null;
    }
  }, [roundStatus, countdownExpired, round?.id]);

  /** Resync si bloqué sur « tirage imminent » > 5 s. */
  useEffect(() => {
    if (!stuckRollSinceRef.current || roundStatus !== "counting" || !countdownExpired) {
      return;
    }

    const id = window.setTimeout(() => {
      if (roundRef.current?.status !== "counting") return;
      if (!isCountdownExpired(roundRef.current, computeCountdownSeconds(roundRef.current))) {
        return;
      }

      setCriticalError(
        lastTriggerErrorRef.current
          ? `Tirage bloqué — ${lastTriggerErrorRef.current}`
          : "Tirage en attente — resynchronisation de l'arène (aucun détail RPC reçu)…"
      );
      rollTriggeredForRoundRef.current = null;
      void refreshState();
    }, JACKPOT_STUCK_ROLL_MS);

    return () => window.clearTimeout(id);
  }, [roundStatus, countdownExpired, round?.id, refreshState]);

  /** À 0 s : recharge les mises puis déclenche trigger_jackpot_roll. */
  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const current = roundRef.current;
    if (!current || current.status !== "counting") return;
    if (countdownSeconds == null || countdownSeconds > 0) return;
    if (rollTriggeredForRoundRef.current === current.id) return;
    if (triggeringRollRef.current) return;

    rollTriggeredForRoundRef.current = current.id;
    triggeringRollRef.current = true;

    void (async () => {
      try {
        if (
          roundRef.current?.id === current.id &&
          (roundRef.current.status === "rolling" ||
            roundRef.current.status === "ended")
        ) {
          return;
        }

        const { count, error: betsError } = await reloadBets(current.id);
        const playerCount = count || aggregateBetsByUser(betsRef.current).length;

        if (betsError) {
          setCriticalError(
            `Impossible de lire les mises (RLS ?) : ${betsError}`
          );
        }

        if (playerCount < 2) {
          const msg = `Tirage bloqué : ${playerCount} gladiateur visible pour la manche ${current.id.slice(0, 8)}… (il en faut 2). Vérifie jackpot_bets.round_id et la policy SELECT.`;
          setCriticalError(msg);
          console.error("ERREUR CRITIQUE JACKPOT:", { reason: "insufficient_players", playerCount, roundId: current.id });
          rollTriggeredForRoundRef.current = null;
          await refreshState();
          return;
        }

        setCriticalError(null);
        lastTriggerErrorRef.current = null;
        const result = await triggerJackpotRoll(current.id);

        if (result.ok && result.round) {
          applyRound({
            ...current,
            ...result.round,
            status: "rolling",
            id: result.round.id || current.id,
          });

          if (result.bets?.length) {
            setBetsAggregated(result.bets);
          }

          if (result.balance != null) {
            setBalance(Math.floor(result.balance));
          } else if (result.round.winner_id === userIdRef.current) {
            void syncBalance();
          }

          setCriticalError(null);
          lastTriggerErrorRef.current = null;

          if (!result.bets?.length) {
            void reloadBets(result.round.id);
          }
        } else if (result.ok) {
          await refreshState();
          const after = roundRef.current;
          if (after?.status === "rolling" || after?.status === "ended") {
            setCriticalError(null);
            lastTriggerErrorRef.current = null;
          } else {
            const errMsg = formatRollError(
              result.error,
              result.sqlMessage,
              result.debug
            );
            lastTriggerErrorRef.current = errMsg;
            setCriticalError(errMsg);
          }
        } else {
          const errMsg = formatRollError(
            result.error,
            result.sqlMessage,
            result.debug
          );
          lastTriggerErrorRef.current = errMsg;
          setCriticalError(errMsg);
          console.error("ERREUR CRITIQUE JACKPOT:", {
            error: result.error,
            sqlMessage: result.sqlMessage,
            debug: result.debug,
            roundId: current.id,
            playerCount,
            countdownSeconds,
          });
          await refreshState();
          const after = roundRef.current;
          if (after?.status === "counting") {
            rollTriggeredForRoundRef.current = null;
          } else if (after?.status === "rolling" || after?.status === "ended") {
            applyRound(after);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setCriticalError(`Exception tirage : ${msg}`);
        console.error("ERREUR CRITIQUE JACKPOT:", err);
        rollTriggeredForRoundRef.current = null;
        await refreshState();
      } finally {
        triggeringRollRef.current = false;
      }
    })();
  }, [
    countdownSeconds,
    round?.id,
    round?.status,
    applyRound,
    reloadBets,
    refreshState,
    syncBalance,
    setBetsAggregated,
  ]);

  const uniqueBets = useMemo(() => aggregateBetsByUser(bets), [bets]);
  const uniquePlayerCount = uniqueBets.length;

  const myBet = useMemo(
    () => uniqueBets.find((b) => b.user_id === userId) ?? null,
    [uniqueBets, userId]
  );

  const segments = useMemo(
    () => buildPotSegments(bets, round?.total_pot ?? 0),
    [bets, round?.total_pot]
  );

  const winnerBet = useMemo(
    () => uniqueBets.find((b) => b.user_id === round?.winner_id) ?? null,
    [uniqueBets, round?.winner_id]
  );

  const winnerPayout = useMemo(() => {
    if (round?.winner_payout != null) return round.winner_payout;
    const pot = round?.total_pot ?? 0;
    return Math.floor(pot * (1 - 0.02));
  }, [round?.winner_payout, round?.total_pot]);

  const arenaClosed =
    roundStatus === "rolling" ||
    roundStatus === "ended" ||
    countdownExpired;
  const alreadyInArena = !!myBet || hasPlacedBet;
  const amountTooLow = betAmount < JACKPOT_MIN_BET;
  const amountTooHigh = betAmount > balance;

  const canBet =
    !!userId &&
    !isDemoMode() &&
    !isSubmitting &&
    !submittingRef.current &&
    !alreadyInArena &&
    !arenaClosed &&
    !amountTooLow &&
    !amountTooHigh;

  const enterArena = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || isDemoMode()) return;
    if (
      submittingRef.current ||
      hasPlacedBetRef.current ||
      arenaClosed ||
      amountTooLow ||
      amountTooHigh
    ) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setMessage(null);
    setCriticalError(null);

    try {
      const result = await enterJackpotArena(uid, betAmount);

      if (result.ok) {
        setHasPlacedBet(true);
        hasPlacedBetRef.current = true;

        if (result.balance != null) setBalance(result.balance);
        else await syncBalance(uid);

        if (result.round) applyRound(result.round);
        if (result.bets?.length) {
          setBetsAggregated(result.bets);
        } else if (result.bet) {
          setBets((prev) =>
            aggregateBetsByUser(mergeBet(prev, result.bet!))
          );
        }
        await reloadBets(result.round?.id ?? roundRef.current?.id);
        setMessage(`Tu entres dans l'arène avec ${betAmount} jetons !`);
      } else {
        const detail = result.debug?.postgrestCode
          ? ` (${result.debug.postgrestCode})`
          : "";
        const hint = result.debug?.postgrestHint
          ? ` — ${result.debug.postgrestHint}`
          : "";
        setMessage(`${result.error ?? "Entrée refusée"}${detail}${hint}`);
        console.error("[MonCasin Jackpot] enterArena échec:", result);
      }
      window.setTimeout(() => setMessage(null), 5000);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    arenaClosed,
    amountTooLow,
    amountTooHigh,
    betAmount,
    applyRound,
    reloadBets,
    syncBalance,
    setBetsAggregated,
  ]);

  return {
    round,
    bets: uniqueBets,
    segments,
    balance,
    betAmount,
    setBetAmount,
    userId,
    myBet,
    winnerBet,
    winnerPayout,
    canBet,
    roundStatus,
    isSubmitting,
    isPlacing: isSubmitting,
    enterArena,
    placeBet: enterArena,
    completeRoundAfterRoll,
    message,
    criticalError,
    connected,
    isSyncing,
    countdownSeconds,
    countdownExpired,
    showWinnerFlash,
    uniquePlayerCount,
    isDemoMode: isDemoMode() || !userId,
    minBet: JACKPOT_MIN_BET,
  };
}
