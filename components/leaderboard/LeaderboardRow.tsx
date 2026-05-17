"use client";

import type { LeaderboardPlayer } from "@/utils/supabase/profiles";
import { formatCoins } from "@/utils/format";
import { VipBadge } from "./VipBadge";
import { cn } from "@/utils/cn";

interface LeaderboardRowProps {
  player: LeaderboardPlayer;
  isCurrentUser?: boolean;
}

export function LeaderboardRow({ player, isCurrentUser }: LeaderboardRowProps) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
        "bg-white/[0.03] backdrop-blur-sm",
        isCurrentUser
          ? "border-casino-purple-neon/50 bg-casino-purple/10 shadow-neon-purple"
          : "border-white/[0.06]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold tabular-nums",
          player.rank <= 10
            ? "bg-casino-gold/15 text-casino-gold-neon"
            : "bg-white/5 text-white/50"
        )}
      >
        {player.rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{player.username}</p>
        <VipBadge status={player.vip_status} className="mt-1" />
      </div>

      <div className="shrink-0 text-right">
        <p className="font-display text-sm font-bold tabular-nums text-casino-gold-neon">
          {formatCoins(player.balance)}
        </p>
        <p className="text-[9px] text-white/35">jetons</p>
      </div>
    </li>
  );
}
