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
  multiplierAtElapsedMs,
} from "@/utils/crash/engine";
import type {
  CrashBetRow,
  CrashPhase,
  CrashPresencePlayer,
  CrashPublicState,
} from "@/utils/crash/types";
import {
  advanceCrashTick,
  cashoutCrash,
  CRASH_CHANNEL,
  fetchCrashHistory,
  fetchCrashState,
  fetchRoundBets,
  placeCrashBet,
} from "@/utils/supabase/crash-room";
import { DEMO_MODE, createClient, safeGetUser } from "@/utils/supabase/client";
import { fetchProfile } from "@/utils/supabase/profiles";
import { useCrashSounds } from "@/hooks/useCrashSounds";
import type { RealtimeChannel } from "@supabase/supabase-js";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

function multiplierFromServerStart(flyingStartedAt: string): number {
  const elapsed = Date.now() - new Date(flyingStartedAt).getTime();
  return multiplierAtElapsedMs(Math.max(0, elapsed));
}

export type { CrashPhase };

export function useCrashGame() {
  const sounds = useCrashSounds();

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [bet, setBet] = useState(DEFAULT_CRASH_BET);
  const [gameState, setGameState] = useState<CrashPublicState | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [roundBets, setRoundBets] = useState<CrashBetRow[]>([]);
  const [presence, setPresence] = useState<CrashPresencePlayer[]>([]);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [curvePoints, setCurvePoints] = useState<number[]>([1]);
  const [bettingSecondsLeft, setBettingSecondsLeft] = useState(5);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const [profileLoading, setProfileLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(DEMO_MODE);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("Joueur");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameStateRef = useRef<CrashPublicState | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<CrashPhase | null>(null);
  const cashedOutRef = useRef(false);

  const phase: CrashPhase = gameState?.phase ?? "betting";
  const crashPoint = gameState?.crash_point ?? null;

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const myBet = roundBets.find((b) => b.user_id === userId) ?? null;
  const hasPlacedBet = !!myBet;
  const hasCashedOut = myBet?.status === "cashed_out";

  const loadBets = useCallback(async (roundId: string) => {
    const { bets } = await fetchRoundBets(roundId);
    setRoundBets(bets);
  }, []);

  const applyState = useCallback(
    (state: CrashPublicState) => {
      const prev = lastPhaseRef.current;
      setGameState(state);

      if (state.phase === "betting") {
        cashedOutRef.current = false;
        setCurvePoints([1]);
        setMultiplier(1);
        if (prev && prev !== "betting") {
          void loadBets(state.round_id);
        }
      }

      if (state.phase === "flying" && prev !== "flying") {
        sounds.playLaunch();
        setCurvePoints([1]);
      }

      if (state.phase === "crashed" && prev !== "crashed" && state.crash_point) {
        sounds.playCrash();
        setCrashHistory((h) =>
          [state.crash_point!, ...h.filter((x) => x !== state.crash_point)].slice(
            0,
            12
          )
        );
        setMessage(`Crash à ${formatMultiplier(state.crash_point)} !`);
        setTimeout(() => setMessage(null), 2500);
      }

      lastPhaseRef.current = state.phase;
      void loadBets(state.round_id);
    },
    [loadBets, sounds]
  );

  const refreshState = useCallback(async () => {
    const { data, error } = await fetchCrashState();
    if (data) applyState(data);
    if (error) setProfileError(error);
  }, [applyState]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setProfileLoading(true);

      if (DEMO_MODE) {
        setIsDemoMode(true);
        setBalance(loadDemoBalance());
        setProfileLoading(false);
      } else {
        const { user } = await safeGetUser();
        if (!mounted) return;
        if (user) {
          setUserId(user.id);
          const { profile } = await fetchProfile(user.id);
          if (profile) {
            setBalance(Number(profile.balance));
            setUsername(profile.username ?? "Joueur");
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
      }

      const { points } = await fetchCrashHistory();
      if (mounted && points.length) setCrashHistory(points);

      await refreshState();
    })();

    return () => {
      mounted = false;
    };
  }, [refreshState]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase.channel(CRASH_CHANNEL, {
      config: { presence: { key: userId ?? `guest-${Math.random()}` } },
    });

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crash_live_state" },
        () => {
          void refreshState();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crash_bets" },
        () => {
          const rid = gameStateRef.current?.round_id;
          if (rid) void loadBets(rid);
        }
      )
      .on("broadcast", { event: "cashout" }, ({ payload }) => {
        const p = payload as {
          user_id: string;
          username: string;
          multiplier: number;
          payout: number;
        };
        setRoundBets((prev) =>
          prev.map((b) =>
            b.user_id === p.user_id
              ? {
                  ...b,
                  status: "cashed_out" as const,
                  cashout_multiplier: p.multiplier,
                  payout: p.payout,
                }
              : b
          )
        );
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<CrashPresencePlayer>();
        const players: CrashPresencePlayer[] = [];
        Object.values(state).forEach((metas) => {
          metas.forEach((m) => players.push(m as CrashPresencePlayer));
        });
        setPresence(players);
      })
      .subscribe(async (status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED" && userId) {
          await channel.track({
            user_id: userId,
            username,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    const tickInterval = setInterval(() => {
      void advanceCrashTick().then(({ data }) => {
        if (data) applyState(data);
      });
    }, 250);

    return () => {
      clearInterval(tickInterval);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [applyState, loadBets, refreshState, userId, username]);

  useEffect(() => {
    if (phase !== "flying" || !gameState?.flying_started_at) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    const startedAt = gameState.flying_started_at;

    const loop = () => {
      const m = multiplierFromServerStart(startedAt);
      setMultiplier(m);
      setCurvePoints((pts) => {
        const next = [...pts, m];
        return next.length > 80 ? next.slice(-80) : next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, gameState?.flying_started_at]);

  useEffect(() => {
    if (phase !== "betting" || !gameState?.betting_ends_at) {
      setBettingSecondsLeft(0);
      return;
    }

    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil(
          (new Date(gameState.betting_ends_at).getTime() - Date.now()) / 1000
        )
      );
      setBettingSecondsLeft(left);
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, gameState?.betting_ends_at]);

  const placeBet = useCallback(async () => {
    if (!userId || isDemoMode) {
      setMessage("Connecte-toi pour jouer en multijoueur.");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    if (phase !== "betting" || bettingSecondsLeft <= 0) return;
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
    if (gameState?.round_id) await loadBets(gameState.round_id);
    setMessage(`Mise de ${bet} jetons enregistrée !`);
    setTimeout(() => setMessage(null), 2000);
  }, [
    bet,
    balance,
    bettingSecondsLeft,
    gameState?.round_id,
    hasPlacedBet,
    isDemoMode,
    loadBets,
    phase,
    userId,
  ]);

  const cashout = useCallback(async () => {
    if (!userId || phase !== "flying" || !myBet || myBet.status !== "active") {
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
    const payout = result.payout ?? calculateCashoutPayout(myBet.bet_amount, finalMult);

    if (result.balance != null) setBalance(result.balance);

    sounds.playCashout();
    setMessage(
      `Cashout ${formatMultiplier(finalMult)} · +${payout.toLocaleString("fr-FR")} jetons`
    );

    channelRef.current?.send({
      type: "broadcast",
      event: "cashout",
      payload: {
        user_id: userId,
        username,
        multiplier: finalMult,
        payout,
      },
    });

    if (gameState?.round_id) await loadBets(gameState.round_id);
  }, [
    gameState?.round_id,
    multiplier,
    myBet,
    phase,
    sounds,
    userId,
    username,
  ]);

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
    !!userId &&
    !isDemoMode &&
    phase === "betting" &&
    bettingSecondsLeft > 0 &&
    !hasPlacedBet &&
    !profileLoading &&
    !isSyncing &&
    balance >= bet;

  const canCashout =
    phase === "flying" &&
    !!myBet &&
    myBet.status === "active" &&
    !cashedOutRef.current &&
    !isSyncing;

  const activePlayersCount = Math.max(roundBets.length, presence.length);
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
    roundBets,
    presence,
    activePlayersCount,
    hasPlacedBet,
    hasCashedOut,
    connected,
    roundNumber: gameState?.round_number ?? 0,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode,
    placeBet,
    cashout,
    changeBet,
  };
}
