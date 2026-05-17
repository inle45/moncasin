"use client";

import { SYMBOLS } from "@/utils/slot/constants";
import type { SlotSymbolId } from "@/utils/slot/types";
import { cn } from "@/utils/cn";

interface SlotCellProps {
  symbolId: SlotSymbolId;
  isSpinning: boolean;
  isWinner: boolean;
  isScatter: boolean;
}

export function SlotCell({
  symbolId,
  isSpinning,
  isWinner,
  isScatter,
}: SlotCellProps) {
  const symbol = SYMBOLS[symbolId];
  const isWild = symbolId === "i4z";

  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-lg border transition-all duration-300",
        "bg-black/30 backdrop-blur-sm",
        isSpinning && "animate-reel-blur border-white/10",
        !isSpinning && "border-white/[0.08]",
        isWinner && "animate-win-flash border-casino-gold-neon/60 shadow-neon-gold scale-105 z-10",
        isScatter && isWinner && "border-yellow-300/70 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
      )}
    >
      {isWild ? (
        <span
          className={cn(
            "font-display text-xs font-extrabold uppercase tracking-tighter",
            "bg-gradient-to-br from-casino-gold-neon to-casino-purple-glow bg-clip-text text-transparent",
            isSpinning && "opacity-80"
          )}
        >
          i4z
        </span>
      ) : (
        <span
          className={cn(
            "select-none text-2xl sm:text-3xl transition-transform duration-200",
            isSpinning && "scale-90 opacity-80",
            isWinner && "scale-110"
          )}
          role="img"
          aria-label={symbol.label}
        >
          {symbol.emoji}
        </span>
      )}
    </div>
  );
}
