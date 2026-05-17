"use client";

import type { LeaderboardPlayer } from "@/utils/supabase/profiles";
import { LeaderboardRow } from "./LeaderboardRow";

interface LeaderboardListProps {
  players: LeaderboardPlayer[];
  currentUserId?: string | null;
}

export function LeaderboardList({
  players,
  currentUserId,
}: LeaderboardListProps) {
  if (players.length === 0) {
    return (
      <p className="mx-4 py-8 text-center text-sm text-white/40">
        Aucun joueur classé pour le moment.
      </p>
    );
  }

  return (
    <section
      aria-label="Classement complet"
      className="mx-4 mt-4"
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
        Classement · #{players[0]?.rank ?? 4} – #{players[players.length - 1]?.rank}
      </h2>
      <ul className="flex flex-col gap-2">
        {players.map((player) => (
          <LeaderboardRow
            key={player.id}
            player={player}
            isCurrentUser={player.id === currentUserId}
          />
        ))}
      </ul>
    </section>
  );
}
