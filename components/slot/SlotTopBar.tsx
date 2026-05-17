"use client";

import Link from "next/link";
import { cn } from "@/utils/cn";
import { formatCoins } from "@/utils/format";

interface SlotTopBarProps {
  balance: number;
  isLoading?: boolean;
  className?: string;
}

export function SlotTopBar({ balance, isLoading, className }: SlotTopBarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        className
      )}
    >
      <Link
        href="/"
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2",
          "text-sm font-medium text-white/80 backdrop-blur-xl transition-all",
          "hover:border-casino-purple-neon/40 hover:text-white active:scale-95"
        )}
      >
        <span aria-hidden>←</span>
        Accueil
      </Link>

      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-casino-gold/30",
          "bg-gradient-to-r from-casino-gold/10 to-casino-purple/10 px-4 py-2 shadow-neon-gold backdrop-blur-xl"
        )}
      >
        <span className="text-lg" aria-hidden>
          🪙
        </span>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
            Solde
          </p>
          <p
            className={cn(
              "font-display text-lg font-bold tabular-nums text-casino-gold-neon",
              isLoading && "animate-pulse opacity-60"
            )}
          >
            {isLoading ? "…" : formatCoins(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
