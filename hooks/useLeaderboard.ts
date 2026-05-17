"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEMO_MODE, safeGetUser } from "@/utils/supabase/client";
import {
  fetchLeaderboardTop100,
  fetchPlayerRank,
  type LeaderboardPlayer,
} from "@/utils/supabase/profiles";

export interface CurrentPlayerStats {
  rank: number;
  username: string;
  balance: number;
  vip_status: string;
  id: string;
  inTop100: boolean;
}

const DEMO_PLAYERS: LeaderboardPlayer[] = [
  { id: "d1", username: "King_i4z", balance: 245000, vip_status: "VIP", rank: 1 },
  { id: "d2", username: "Sofia88", balance: 189500, vip_status: "VIP", rank: 2 },
  { id: "d3", username: "Max_P", balance: 142000, vip_status: "Gold", rank: 3 },
  { id: "d4", username: "Léa_V", balance: 98500, vip_status: "Gold", rank: 4 },
  { id: "d5", username: "Tom_Casino", balance: 76200, vip_status: "Joueur", rank: 5 },
  { id: "d6", username: "Nina_X", balance: 54100, vip_status: "Joueur", rank: 6 },
  { id: "d7", username: "Jules_42", balance: 42000, vip_status: "Joueur", rank: 7 },
  { id: "d8", username: "Emma_G", balance: 31500, vip_status: "Joueur", rank: 8 },
];

function getDemoLeaderboardData() {
  return {
    players: DEMO_PLAYERS,
    currentPlayer: null as CurrentPlayerStats | null,
    isDemo: true,
    error: null as string | null,
  };
}

export function useLeaderboard() {
  const demo = DEMO_MODE;

  const [players, setPlayers] = useState<LeaderboardPlayer[]>(
    demo ? DEMO_PLAYERS : []
  );
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayerStats | null>(
    null
  );
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(demo);

  const load = useCallback(async () => {
    if (demo) {
      const demoData = getDemoLeaderboardData();
      setPlayers(demoData.players);
      setCurrentPlayer(demoData.currentPlayer);
      setIsDemo(true);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { players: topPlayers, error: lbError } =
      await fetchLeaderboardTop100();

    if (lbError || topPlayers.length === 0) {
      const demoData = getDemoLeaderboardData();
      setPlayers(demoData.players);
      setIsDemo(true);
      setError(lbError);
      setCurrentPlayer(null);
      setLoading(false);
      return;
    }

    setPlayers(topPlayers);
    setIsDemo(false);

    const { user } = await safeGetUser();

    if (!user) {
      setCurrentPlayer(null);
      setLoading(false);
      return;
    }

    const inList = topPlayers.find((p) => p.id === user.id);

    if (inList) {
      setCurrentPlayer({
        id: inList.id,
        rank: inList.rank,
        username: inList.username,
        balance: inList.balance,
        vip_status: inList.vip_status,
        inTop100: true,
      });
    } else {
      const { rank, profile, error: rankError } = await fetchPlayerRank(
        user.id
      );

      if (profile && rank) {
        setCurrentPlayer({
          id: profile.id,
          rank,
          username: profile.username ?? "Joueur",
          balance: Number(profile.balance),
          vip_status: profile.vip_status,
          inTop100: false,
        });
      } else if (rankError) {
        setError(rankError);
      }
    }

    setLoading(false);
  }, [demo]);

  useEffect(() => {
    load();
  }, [load]);

  const top3 = useMemo(() => players.slice(0, 3), [players]);
  const rest = useMemo(() => players.slice(3), [players]);

  return {
    players,
    top3,
    rest,
    currentPlayer,
    loading,
    error,
    isDemo,
    refresh: load,
  };
}
