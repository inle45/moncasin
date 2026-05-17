"use client";

import type { SlotSymbolId } from "@/utils/slot/types";
import { SlotCell } from "./SlotCell";
import { cn } from "@/utils/cn";

interface SlotReelColumnProps {
  columnIndex: number;
  symbols: [SlotSymbolId, SlotSymbolId, SlotSymbolId];
  isColumnSpinning: boolean;
  isSpinning: boolean;
  winningRows: Set<number>;
}

export function SlotReelColumn({
  columnIndex,
  symbols,
  isColumnSpinning,
  isSpinning,
  winningRows,
}: SlotReelColumnProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-1.5 rounded-xl p-1",
        "bg-gradient-to-b from-zinc-600/40 via-zinc-800/60 to-zinc-950/80",
        "shadow-[inset_0_2px_12px_rgba(0,0,0,0.6),0_0_16px_rgba(168,85,247,0.15)]",
        "border border-white/10",
        isColumnSpinning && "ring-1 ring-casino-purple-neon/40"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl border border-casino-gold-neon/20",
          isColumnSpinning && "animate-pulse border-casino-gold-neon/50"
        )}
        aria-hidden
      />
      {symbols.map((symbolId, rowIndex) => (
        <SlotCell
          key={`${columnIndex}-${rowIndex}`}
          symbolId={symbolId}
          isSpinning={isSpinning}
          columnSpinning={isColumnSpinning}
          isWinner={winningRows.has(rowIndex)}
          isScatter={symbolId === "scatter"}
        />
      ))}
    </div>
  );
}
