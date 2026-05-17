"use client";

import Link from "next/link";
import { cn } from "@/utils/cn";
import { formatCoins } from "@/utils/format";

interface CrashHeaderProps {
  balance: number;
  isLoading?: boolean;
}

export function CrashHeader({ balance, isLoading }: CrashHeaderProps) {
  return (
    <header className="px-4 pt-3">
      <div className="flex items-center justify-between gap-3">
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
            "bg-gradient-to-r from-casino-gold/10 to-casino-purple/10 px-3 py-2 shadow-neon-gold backdrop-blur-xl"
          )}
        >
          <span className="text-lg" aria-hidden>
            🪙
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
              Solde
            </p>
            <p
              className={cn(
                "font-display text-base font-bold tabular-nums text-casino-gold-neon",
                isLoading && "animate-pulse opacity-60"
              )}
            >
              {isLoading ? "…" : formatCoins(balance)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-casino-purple-glow/80">
          Multijoueur simulé
        </p>
        <h1 className="mt-1 font-display text-xl font-bold text-white">
          Crash{" "}
          <span className="bg-gradient-to-r from-casino-gold-neon to-casino-purple-glow bg-clip-text text-transparent">
            Neon
          </span>
        </h1>
        <p className="mt-1 text-xs text-white/40">
          Cashout avant l&apos;explosion · style Aviator
        </p>
      </div>
    </header>
  );
}
