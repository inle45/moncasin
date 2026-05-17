"use client";

import { SYMBOLS } from "@/utils/slot/constants";
import type { SlotSymbolId } from "@/utils/slot/types";
import { cn } from "@/utils/cn";

interface SlotCellProps {
  symbolId: SlotSymbolId;
  isSpinning: boolean;
  isWinner: boolean;
  isScatter: boolean;
  columnSpinning?: boolean;
}

const SYMBOL_STYLES: Partial<
  Record<SlotSymbolId, { bg: string; ring: string; glow: string }>
> = {
  diamond: {
    bg: "bg-gradient-to-br from-sky-300/30 via-cyan-200/20 to-blue-600/40",
    ring: "ring-cyan-300/50",
    glow: "shadow-[0_0_18px_rgba(34,211,238,0.55)]",
  },
  crown: {
    bg: "bg-gradient-to-br from-amber-300/35 via-yellow-200/25 to-amber-700/45",
    ring: "ring-amber-300/55",
    glow: "shadow-[0_0_18px_rgba(255,215,0,0.5)]",
  },
  seven: {
    bg: "bg-gradient-to-br from-red-500/30 via-rose-400/20 to-red-900/40",
    ring: "ring-red-400/50",
    glow: "shadow-[0_0_16px_rgba(248,113,113,0.45)]",
  },
  i4z: {
    bg: "bg-gradient-to-br from-violet-500/40 via-fuchsia-400/25 to-purple-900/50",
    ring: "ring-fuchsia-400/60",
    glow: "shadow-[0_0_20px_rgba(217,70,239,0.55)]",
  },
  scatter: {
    bg: "bg-gradient-to-br from-yellow-300/30 via-amber-200/20 to-orange-600/35",
    ring: "ring-yellow-300/55",
    glow: "shadow-[0_0_20px_rgba(250,204,21,0.5)]",
  },
};

export function SlotCell({
  symbolId,
  isSpinning,
  isWinner,
  isScatter,
  columnSpinning = false,
}: SlotCellProps) {
  const symbol = SYMBOLS[symbolId];
  const isWild = symbolId === "i4z";
  const premium = SYMBOL_STYLES[symbolId];
  const spinning = isSpinning || columnSpinning;

  return (
    <div
      className={cn(
        "relative flex aspect-[0.85] items-center justify-center overflow-hidden rounded-lg",
        "border border-white/10 ring-1 ring-inset ring-white/5",
        "bg-gradient-to-b from-zinc-700/90 via-zinc-800/95 to-zinc-950",
        premium?.bg,
        premium?.ring,
        spinning && "animate-reel-column-blur",
        isWinner &&
          cn(
            "z-10 scale-[1.06] animate-win-flash border-casino-gold-neon/70",
            premium?.glow ?? "shadow-neon-gold"
          ),
        isScatter && isWinner && "border-yellow-300/80"
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent"
        aria-hidden
      />

      {isWild ? (
        <div className="relative flex flex-col items-center">
          <span
            className={cn(
              "text-2xl sm:text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]",
              spinning && "opacity-70"
            )}
            role="img"
            aria-label={symbol.label}
          >
            🃏
          </span>
          <span className="mt-0.5 font-display text-[8px] font-black uppercase tracking-[0.2em] text-fuchsia-200">
            Wild
          </span>
        </div>
      ) : (
        <span
          className={cn(
            "relative select-none text-2xl sm:text-[1.75rem] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]",
            spinning && "scale-90 opacity-75 blur-[0.5px]",
            isWinner && "scale-110",
            symbolId === "diamond" && "brightness-125"
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
