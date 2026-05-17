"use client";

import { JACKPOT_TIERS, SYMBOLS } from "@/utils/slot/constants";
import type { JackpotPools } from "@/utils/supabase/jackpots";
import type { JackpotTier } from "@/utils/slot/types";
import { cn } from "@/utils/cn";

interface JackpotBarProps {
  pools: JackpotPools;
  pulseTier?: string | null;
  isLoading?: boolean;
}

export function JackpotBar({ pools, pulseTier, isLoading }: JackpotBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-4">
      {JACKPOT_TIERS.map((tier) => {
        const amount = pools[tier.tier as JackpotTier];
        const isPulsing = pulseTier === tier.tier;

        return (
          <div
            key={tier.tier}
            className={cn(
              "relative overflow-hidden rounded-xl border p-2 backdrop-blur-xl transition-all duration-300",
              "bg-gradient-to-b from-zinc-800/80 to-zinc-950/90",
              tier.border,
              tier.glow,
              isPulsing && "scale-105 animate-pulse-glow"
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex items-center justify-between gap-1">
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  tier.text
                )}
              >
                {tier.label}
              </span>
              <span className="text-sm" aria-hidden>
                {SYMBOLS[tier.symbol].emoji}
              </span>
            </div>
            <p
              className={cn(
                "mt-0.5 font-display text-sm font-bold tabular-nums",
                tier.text,
                isLoading && "animate-pulse opacity-60"
              )}
            >
              {isLoading ? "…" : amount.toLocaleString("fr-FR")}
            </p>
            <p className="text-[9px] text-casino-gold-neon/70">
              Progressif · + avec chaque mise
            </p>
          </div>
        );
      })}
    </div>
  );
}

