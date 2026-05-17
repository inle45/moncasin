"use client";

import { useLiveFeed } from "@/hooks/useLiveFeed";
import { formatCoins } from "@/utils/format";
import { cn } from "@/utils/cn";

function FeedItem({
  username,
  game,
  amount,
}: {
  username: string;
  game: string;
  amount: number;
}) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 px-4 text-sm">
      <span className="font-semibold text-casino-gold-neon">{username}</span>
      <span className="text-white/50">a gagné</span>
      <span className="font-bold text-casino-purple-glow">
        {formatCoins(amount)} jetons
      </span>
      <span className="text-white/40">sur</span>
      <span className="text-white/70">{game}</span>
      <span className="text-casino-gold/40">◆</span>
    </span>
  );
}

export function LiveFeed({ className }: { className?: string }) {
  const { entries } = useLiveFeed();
  const duplicated = [...entries, ...entries];

  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-white/[0.06] bg-casino-surface/60 backdrop-blur-xl",
        className
      )}
      role="region"
      aria-label="Live Feed des gains"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-casino-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-casino-bg to-transparent" />

      <div className="flex items-center gap-2 px-3 py-2">
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-casino-gold/30 bg-casino-gold/10 px-2.5 py-1"
          aria-hidden
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-casino-gold-neon">
            Live
          </span>
        </div>

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div
            className="flex animate-marquee whitespace-nowrap"
            style={{ width: "max-content" }}
          >
            {duplicated.map((entry, i) => (
              <FeedItem
                key={`${entry.id}-${i}`}
                username={entry.username}
                game={entry.game}
                amount={entry.amount}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
