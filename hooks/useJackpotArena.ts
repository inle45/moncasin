"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runJackpotLoopTick } from "@/utils/jackpot/advance-client";
import { JACKPOT_LOOP_TICK_MS, JACKPOT_MIN_BET } from "@/utils/jackpot/constants";
import { buildPotSegments } from "@/utils/jackpot/segments";
import type { JackpotBetRow, JackpotRound } from "@/utils/jackpot/types";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import { createClient } from "@/utils/supabase/client";
import { isDemoMode, isSupabaseConfigured } from "@/utils/supabase/config";
import {
  JACKPOT_CHANNEL,
  fetchActiveJackpotRound,
  fetchJackpotBets,
  placeJackpotBet,
} from "@/utils/supabase/jackpot-room";
import { fetchProfile } from "@/utils/supabase/profiles";

export function useJackpotArena() {
  const roundRef = useRef<JackpotRound | null>(null);
  const userIdRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  const placingRef = useRef(false);

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
  const prevStatusRef = useRef<string | null>(null);

  roundRef.current = round;

  const applyRound = useCallback((next: JackpotRound | null) => {
    if (!next) return;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = next.status;

    if (next.status === "ended" && prevStatus !== "ended") {
      setShowWinnerFlash(true);
      window.setTimeout(() => setShowWinnerFlash(false), 4500);
    }

    roundRef.current = next;
    setRound(next);
  }, []);

  const reloadBets = useCallback(async (roundId?: string) => {
    const rid = roundId ?? roundRef.current?.id;
    if (!rid) return;
    const { bets: rows } = await fetchJackpotBets(rid);
    setBets(rows);
  }, []);

  const refreshState = useCallback(async () => {
    const { data } = await fetchActiveJackpotRound();
    if (data) {
      applyRound(data);
      await reloadBets(data.id);
    }
    return data;
  }, [applyRound, reloadBets]);

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
      if (uid) {
        const { profile } = await fetchProfile(uid);
        if (profile) setBalance(Math.floor(Number(profile.balance)));
      }
    }

    let state = await refreshState();
    if (!state) {
      await runJackpotLoopTick();
      state = await refreshState();
    }
    setIsSyncing(false);
  }, [refreshState]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(JACKPOT_CHANNEL)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_rounds" },
        () => {
          void refreshState();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jackpot_bets" },
        () => {
          void reloadBets();
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void refreshState();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshState, reloadBets]);

  useEffect(() => {
    if (!isSupabaseConfigured() || isDemoMode()) return;

    const runTick = async () => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      try {
        const tick = await runJackpotLoopTick();
        if (tick.round) {
          applyRound(tick.round);
          await reloadBets(tick.round.id);
        }
      } finally {
        advancingRef.current = false;
      }
    };

    void runTick();
    const id = setInterval(() => void runTick(), JACKPOT_LOOP_TICK_MS);
    return () => clearInterval(id);
  }, [applyRound, reloadBets]);

  useEffect(() => {
    if (round?.status !== "counting" || !round.counting_ends_at) {
      setCountdownSeconds(null);
      return;
    }

    const tick = () => {
      const end = new Date(round.counting_ends_at!).getTime();
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setCountdownSeconds(left);
    };

    tick();
    const id = setInterval(tick, 250);
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

  const canBet =
    !!userId &&
    !myBet &&
    (round?.status === "waiting" || round?.status === "counting") &&
    balance >= betAmount &&
    betAmount >= JACKPOT_MIN_BET;

  const placeBet = useCallback(async () => {
    if (!canBet || placingRef.current) return;

    placingRef.current = true;
    setMessage(null);
    try {
      const { ok, balance: newBal, round: nextRound, error } =
        await placeJackpotBet(betAmount);

      if (ok) {
        if (newBal != null) setBalance(newBal);
        if (nextRound) applyRound(nextRound);
        await reloadBets(nextRound?.id);
        setMessage(`Mise de ${betAmount} jetons enregistrée !`);
      } else {
        setMessage(error ?? "Mise refusée");
      }
      window.setTimeout(() => setMessage(null), 2500);
    } finally {
      placingRef.current = false;
    }
  }, [canBet, betAmount, applyRound, reloadBets]);

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
    canBet,
    placeBet,
    message,
    connected,
    isSyncing,
    countdownSeconds,
    showWinnerFlash,
    isDemoMode: isDemoMode() || !userId,
    minBet: JACKPOT_MIN_BET,
  };
}
