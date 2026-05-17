"use client";

import { JACKPOT_TIERS, SYMBOLS } from "@/utils/slot/constants";
import { jackpotAmount } from "@/utils/slot/engine";
import { cn } from "@/utils/cn";

interface JackpotBarProps {
  bet: number;
  pulseTier?: string | null;
}

export function JackpotBar({ bet, pulseTier }: JackpotBarProps) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-4">
      {JACKPOT_TIERS.map((tier) => {
        const amount = jackpotAmount(bet, tier.multiplier);
        const isPulsing = pulseTier === tier.tier;

        return (
          <div
            key={tier.tier}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-white/[0.04] p-2 backdrop-blur-xl transition-all duration-300",
              tier.border,
              tier.glow,
              isPulsing && "scale-105 animate-pulse-glow"
            )}
          >
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
            <p className={cn("mt-0.5 font-display text-sm font-bold tabular-nums", tier.text)}>
              {amount.toLocaleString("fr-FR")}
            </p>
            <p className="text-[9px] text-white/35">{tier.multiplier}× mise</p>
          </div>
        );
      })}
    </div>
  );
}
