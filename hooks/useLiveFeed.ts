"use client";

import { useEffect, useState } from "react";

export interface LiveFeedEntry {
  id: string;
  username: string;
  game: string;
  amount: number;
  timestamp: number;
}

const INITIAL_FEED: LiveFeedEntry[] = [
  { id: "1", username: "Léa_V", game: "Slot Neon", amount: 12500, timestamp: Date.now() },
  { id: "2", username: "Max_King", game: "Roue Quotidienne", amount: 5000, timestamp: Date.now() },
  { id: "3", username: "Sofia88", game: "Jackpot VIP", amount: 89000, timestamp: Date.now() },
  { id: "4", username: "Tom_P", game: "Machine à Sous", amount: 3200, timestamp: Date.now() },
  { id: "5", username: "Nina_X", game: "Leaderboard Bonus", amount: 15000, timestamp: Date.now() },
  { id: "6", username: "Alex_D", game: "Slot Diamond", amount: 45000, timestamp: Date.now() },
];

const EXTRA_WINS: Omit<LiveFeedEntry, "id" | "timestamp">[] = [
  { username: "Jules_42", game: "Roue Quotidienne", amount: 8000 },
  { username: "Emma_G", game: "Boutique VIP", amount: 22000 },
  { username: "Chris_W", game: "Slot Neon", amount: 6700 },
  { username: "Luna_M", game: "Machine à Sous", amount: 112000 },
];

export function useLiveFeed() {
  const [entries, setEntries] = useState<LiveFeedEntry[]>(INITIAL_FEED);

  useEffect(() => {
    const interval = setInterval(() => {
      const random = EXTRA_WINS[Math.floor(Math.random() * EXTRA_WINS.length)];
      const newEntry: LiveFeedEntry = {
        ...random,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setEntries((prev) => [newEntry, ...prev].slice(0, 12));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return { entries };
}
