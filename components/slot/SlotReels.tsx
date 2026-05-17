"use client";

import type { Grid } from "@/utils/slot/types";
import { SlotCell } from "./SlotCell";
import { cn } from "@/utils/cn";

interface SlotReelsProps {
  grid: Grid;
  isSpinning: boolean;
  winningCells: Set<string>;
  freeSpinMode: boolean;
}

export function SlotReels({
  grid,
  isSpinning,
  winningCells,
  freeSpinMode,
}: SlotReelsProps) {
  return (
    <div className="relative mx-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-3 shadow-glass backdrop-blur-xl transition-colors duration-700",
          freeSpinMode
            ? "border-cyan-400/40 bg-gradient-to-b from-cyan-950/40 via-violet-950/30 to-casino-bg/80"
            : "border-white/[0.1] bg-white/[0.04]"
        )}
      >
        {freeSpinMode && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.15),transparent_70%)]" />
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-t from-violet-600/10 to-transparent" />
          </>
        )}

        <div className="relative z-10 grid grid-cols-3 gap-2">
          {grid.map((row, rowIndex) =>
            row.map((symbolId, colIndex) => {
              const cellKey = `${rowIndex}-${colIndex}`;
              return (
                <SlotCell
                  key={cellKey}
                  symbolId={symbolId}
                  isSpinning={isSpinning}
                  isWinner={winningCells.has(cellKey)}
                  isScatter={symbolId === "scatter"}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
