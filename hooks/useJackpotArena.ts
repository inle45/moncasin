"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runJackpotLoopTick } from "@/utils/jackpot/advance-client";
import {
  JACKPOT_COUNTDOWN_SECONDS,
  JACKPOT_ENDED_DISPLAY_MS,
  JACKPOT_LOOP_TICK_MS,
  JACKPOT_MIN_BET,
  JACKPOT_STATE_POLL_MS,
} from "@/utils/jackpot/constants";
import { parseJackpotBet, parseJackpotRound } from "@/utils/jackpot/parse";
import { buildPotSegments } from "@/utils/jackpot/segments";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode, isSupabaseConfigured } from "@/utils/supabase/config";
import {
  JACKPOT_CHANNEL,
  enterJackpotArena,
  fetchActiveJackpotRound,
  fetchJackpotBets,
} from "@/utils/supabase/jackpot-room";
import { fetchProfile } from "@/utils/supabase/profiles";

function mergeBet(
  prev: JackpotBetRow[],
  incoming: JackpotBetRow
): JackpotBetRow[] {
  const idx = prev.findIndex((b) => b.id === incoming.id);
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

export function useJackpotArena() {
  const roundRef = useRef<JackpotRound | null>(null);
  const userIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const placingRef = useRef(false);
  const countingStartedAtRef = useRef<number | null>(null);

  const [round, setRound] = useState<JackpotRound | null>(null);
  const [bets, setBets] = useState<JackpotBetRow[]>([]);
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [userId, setUserId] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(isSupabaseConfigured());
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [showWinnerFlash, setShowWinnerFlash] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const prevStatusRef = useRef<string | null>(null);
  const prevRoundIdRef = useRef<string | null>(null);

  roundRef.current = round;

  const applyRound = useCallback((next: JackpotRound | null) => {
    if (!next) return;

    const prevStatus = prevStatusRef.current;
    const prevRoundId = prevRoundIdRef.current;
    prevStatusRef.current = next.status;
    prevRoundIdRef.current = next.id;

    if (next.status === "counting" && prevStatus !== "counting") {
      countingStartedAtRef.current = Date.now();
    }
    if (next.status === "waiting" && prevRoundId && prevRoundId !== next.id) {
      setShowWinnerFlash(false);
      setBets([]);
    }
    if (next.status === "ended" && prevStatus !== "ended") {
      setShowWinnerFlash(true);
      window.setTimeout(() => setShowWinnerFlash(false), JACKPOT_ENDED_DISPLAY_MS);
    }

    roundRef.current = next;
    setRound(next);
  }, []);

  const applyBetRow = useCallback((row: Record<string, unknown>) => {
    const bet = parseJackpotBet(row);
    if (!bet) return;
    const rid = roundRef.current?.id;
    if (rid && bet.round_id !== rid) return;
    setBets((prev) => mergeBet(prev, bet));
  }, []);

  const reloadBets = useCallback(async (roundId?: string) => {
    const rid = roundId ?? roundRef.current?.id;
    if (!rid) return;
    const { bets: rows } = await fetchJackpotBets(rid);
    setBets(rows);
  }, []);

  const refreshState = useCallback(async () => {
    const { data, error } = await fetchActiveJackpotRound();
    if (error) {
      console.warn("[MonCasin Jackpot] refreshState:", error);
      return null;
    }
    if (data) {
      applyRound(data);
      await reloadBets(data.id);
    } else {
      console.warn("[MonCasin Jackpot] Aucune manche jackpot_rounds trouvée");
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
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (!row?.id) {
            void refreshState();
            return;
          }
          const parsed = parseJackpotRound(row);
          if (parsed) {
            applyRound(parsed);
            if (payload.eventType !== "DELETE") {
              void reloadBets(parsed.id);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_bets" },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            applyBetRow(payload.new as Record<string, unknown>);
          }
          const rid = roundRef.current?.id;
          if (rid) void reloadBets(rid);
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
  }, [applyRound, applyBetRow, refreshState, reloadBets]);

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const poll = async () => {
      await refreshState();
    };

    const pollId = setInterval(() => void poll(), JACKPOT_STATE_POLL_MS);

    const runTick = async () => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        const tick = await runJackpotLoopTick();
        if (tick.round) {
          applyRound(tick.round);
          setBets(tick.bets);
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
  }, [applyRound, refreshState, syncBalance]);

  useEffect(() => {
    if (round?.status !== "counting") {
      setCountdownSeconds(null);
      return;
    }

    const tick = () => {
      if (round.counting_ends_at) {
        const end = new Date(round.counting_ends_at).getTime();
        const left = Math.max(
          0,
          Math.min(
            JACKPOT_COUNTDOWN_SECONDS,
            Math.ceil((end - Date.now()) / 1000)
          )
        );
        setCountdownSeconds(left);
        return;
      }

      const started = countingStartedAtRef.current ?? Date.now();
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setCountdownSeconds(Math.max(0, JACKPOT_COUNTDOWN_SECONDS - elapsed));
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [round?.status, round?.counting_ends_at]);

  const myBet = useMemo(
    () => bets.find((b) => b.user_id === userId) ?? null,
    [bets, userId]
  );

  const segments = useMemo(
    () => buildPotSegments(bets, round?.total_pot ?? 0),
    [bets, round?.total_pot]
  );

  const winnerBet = useMemo(
    () => bets.find((b) => b.user_id === round?.winner_id) ?? null,
    [bets, round?.winner_id]
  );

  const winnerPayout = useMemo(() => {
    if (round?.winner_payout != null) return round.winner_payout;
    const pot = round?.total_pot ?? 0;
    return Math.floor(pot * (1 - 0.02));
  }, [round?.winner_payout, round?.total_pot]);

  /** Pas de manche en base = waiting (la RPC crée la manche). */
  const roundStatus = round?.status ?? "waiting";
  const arenaClosed =
    roundStatus === "rolling" || roundStatus === "ended";
  const amountTooLow = betAmount < JACKPOT_MIN_BET;
  const amountTooHigh = betAmount > balance;

  const canBet =
    !!userId &&
    !isDemoMode() &&
    !isPlacing &&
    !arenaClosed &&
    !amountTooLow &&
    !amountTooHigh;

  const enterArena = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || placingRef.current || isDemoMode()) return;
    if (arenaClosed || amountTooLow || amountTooHigh) return;

    placingRef.current = true;
    setIsPlacing(true);
    setMessage(null);
    try {
      const result = await enterJackpotArena(uid, betAmount);

      if (result.ok) {
        if (result.balance != null) setBalance(result.balance);
        else await syncBalance(uid);
        if (result.round) applyRound(result.round);
        if (result.bet) setBets((prev) => mergeBet(prev, result.bet!));
        await refreshState();
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
      placingRef.current = false;
      setIsPlacing(false);
    }
  }, [
    arenaClosed,
    amountTooLow,
    amountTooHigh,
    betAmount,
    applyRound,
    refreshState,
    syncBalance,
  ]);

  return {
    round,
    bets,
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
    isPlacing,
    enterArena,
    placeBet: enterArena,
    message,
    connected,
    isSyncing,
    countdownSeconds,
    showWinnerFlash,
    isDemoMode: isDemoMode() || !userId,
    minBet: JACKPOT_MIN_BET,
  };
}
