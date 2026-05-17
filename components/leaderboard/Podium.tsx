"use client";

import type { LeaderboardPlayer } from "@/utils/supabase/profiles";
import { formatCoins } from "@/utils/format";
import { VipBadge } from "./VipBadge";
import { cn } from "@/utils/cn";

interface PodiumProps {
  players: LeaderboardPlayer[];
}

const PODIUM_CONFIG = [
  {
    place: 2,
    index: 1,
    height: "h-28",
    order: "order-1",
    medal: "🥈",
    glow: "from-slate-300/20 to-slate-500/10",
    border: "border-slate-400/40",
    text: "text-slate-200",
    crown: false,
  },
  {
    place: 1,
    index: 0,
    height: "h-36",
    order: "order-2",
    medal: "👑",
    glow: "from-casino-gold-neon/30 to-casino-gold/10",
    border: "border-casino-gold-neon/60",
    text: "text-casino-gold-neon",
    crown: true,
  },
  {
    place: 3,
    index: 2,
    height: "h-24",
    order: "order-3",
    medal: "🥉",
    glow: "from-amber-700/25 to-amber-900/10",
    border: "border-amber-600/40",
    text: "text-amber-400",
    crown: false,
  },
] as const;

function PodiumSlot({
  player,
  config,
}: {
  player: LeaderboardPlayer | undefined;
  config: (typeof PODIUM_CONFIG)[number];
}) {
  if (!player) {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-end",
          config.order,
          config.height
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col items-center justify-end",
        config.order
      )}
    >
      {config.crown && (
        <div className="pointer-events-none absolute -top-2 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full bg-casino-gold-neon/25 blur-2xl" />
      )}

      <div className="relative z-10 mb-2 flex flex-col items-center">
        <span className="text-2xl" aria-hidden>
          {config.medal}
        </span>
        <p
          className={cn(
            "mt-1 max-w-[5.5rem] truncate text-center font-display text-sm font-bold",
            config.text
          )}
        >
          {player.username}
        </p>
        <VipBadge status={player.vip_status} className="mt-1" />
        <p className="mt-1 font-display text-xs font-bold tabular-nums text-white">
          {formatCoins(player.balance)}
        </p>
      </div>

      <div
        className={cn(
          "relative w-full rounded-t-2xl border bg-gradient-to-t backdrop-blur-xl",
          config.height,
          config.border,
          config.glow
        )}
      >
        <span
          className={cn(
            "absolute inset-x-0 top-3 text-center font-display text-3xl font-black opacity-90",
            config.text
          )}
        >
          {config.place}
        </span>
      </div>
    </div>
  );
}

export function Podium({ players }: PodiumProps) {
  return (
    <section
      aria-label="Podium du classement"
      className="mx-4 mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 shadow-glass backdrop-blur-xl"
    >
      <div className="flex items-end justify-center gap-2 sm:gap-3">
        {PODIUM_CONFIG.map((config) => (
          <PodiumSlot
            key={config.place}
            player={players[config.index]}
            config={config}
          />
        ))}
      </div>
    </section>
  );
}
