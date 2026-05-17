"use client";

import Link from "next/link";
import type { CurrentPlayerStats } from "@/hooks/useLeaderboard";
import { formatCoins } from "@/utils/format";
import { VipBadge } from "./VipBadge";
import { cn } from "@/utils/cn";

interface PlayerStickyBarProps {
  player: CurrentPlayerStats | null;
  loading: boolean;
}

export function PlayerStickyBar({ player, loading }: PlayerStickyBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08]",
        "bg-casino-bg/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 sm:max-w-2xl">
        {loading ? (
          <>
            <div className="h-10 w-10 animate-pulse rounded-lg bg-white/10" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
              <div className="h-2 w-16 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded bg-white/10" />
          </>
        ) : player ? (
          <>
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold",
                player.inTop100
                  ? "bg-casino-purple/30 text-casino-purple-glow"
                  : "bg-white/10 text-white/60"
              )}
            >
              #{player.rank}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/40">Ta position</p>
              <p className="truncate font-semibold text-white">{player.username}</p>
              <VipBadge status={player.vip_status} className="mt-0.5" />
            </div>
            <div className="shrink-0 text-right">
              <p className="font-display text-base font-bold tabular-nums text-casino-gold-neon">
                {formatCoins(player.balance)}
              </p>
              {!player.inTop100 && (
                <p className="text-[9px] text-casino-purple-glow">Hors top 100</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <p className="text-sm text-white/50">
              Connecte-toi pour voir ta position
            </p>
            <Link
              href="/auth"
              className="shrink-0 rounded-xl border border-casino-purple-neon/40 bg-casino-purple/20 px-4 py-2 text-xs font-semibold text-white"
            >
              Connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
