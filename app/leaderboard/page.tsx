"use client";

import {
  LeaderboardHeader,
  LeaderboardList,
  LeaderboardSkeleton,
  PlayerStickyBar,
  Podium,
} from "@/components/leaderboard";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { cn } from "@/utils/cn";

export default function LeaderboardPage() {
  const {
    top3,
    rest,
    currentPlayer,
    loading,
    error,
    isDemo,
    refresh,
  } = useLeaderboard();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-casino-bg pb-28 sm:max-w-2xl">
      <LeaderboardHeader />

      {isDemo && !loading && (
        <p className="mx-4 mt-2 rounded-lg border border-casino-purple-neon/30 bg-casino-purple/10 px-3 py-2 text-center text-xs text-casino-purple-glow">
          Mode démo — connecte Supabase pour le classement réel
        </p>
      )}

      {error && !loading && (
        <div className="mx-4 mt-2 flex flex-col items-center gap-2">
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
            {error}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="text-xs font-semibold text-casino-gold-neon underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <LeaderboardSkeleton />
      ) : (
        <>
          <Podium players={top3} />
          <LeaderboardList
            players={rest}
            currentUserId={currentPlayer?.id}
          />
        </>
      )}

      <PlayerStickyBar player={currentPlayer} loading={loading} />

      {/* Fond dégradé bas */}
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 h-32",
          "bg-gradient-to-t from-casino-bg to-transparent"
        )}
        aria-hidden
      />
    </div>
  );
}
