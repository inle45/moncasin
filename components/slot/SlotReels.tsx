"use client";

import { useMemo, useState, useEffect } from "react";
import type { Grid } from "@/utils/slot/types";
import { PAYLINE_COUNT } from "@/utils/slot/constants";
import { SlotReelColumn } from "./SlotReelColumn";
import { CoinRain } from "./CoinRain";
import { cn } from "@/utils/cn";

interface SlotReelsProps {
  grid: Grid;
  isSpinning: boolean;
  winningCells: Set<string>;
  freeSpinMode: boolean;
  showCoinRain: boolean;
  jackpotWin?: boolean;
}

export function SlotReels({
  grid,
  isSpinning,
  winningCells,
  freeSpinMode,
  showCoinRain,
  jackpotWin,
}: SlotReelsProps) {
  const [spinningColumns, setSpinningColumns] = useState([false, false, false]);

  useEffect(() => {
    if (!isSpinning) {
      setSpinningColumns([false, false, false]);
      return;
    }
    setSpinningColumns([true, true, true]);
    const t1 = setTimeout(() => {
      setSpinningColumns((c) => [false, c[1], c[2]]);
    }, 2200);
    const t2 = setTimeout(() => {
      setSpinningColumns((c) => [false, false, c[2]]);
    }, 2480);
    const t3 = setTimeout(() => {
      setSpinningColumns([false, false, false]);
    }, 2760);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isSpinning]);

  const columns = useMemo(
    () =>
      [0, 1, 2].map((col) => ({
        col,
        symbols: [grid[0][col], grid[1][col], grid[2][col]] as const,
        winningRows: new Set(
          [0, 1, 2].filter((row) => winningCells.has(`${row}-${col}`))
        ),
      })),
    [grid, winningCells]
  );

  return (
    <div className="relative mx-4">
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.25rem] p-3 sm:p-4",
          "border-2 border-casino-gold/40",
          "bg-gradient-to-b from-zinc-700 via-zinc-900 to-black",
          "shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_2px_0_rgba(255,255,255,0.12),0_0_32px_rgba(168,85,247,0.25)]",
          freeSpinMode && "border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-4 top-2 h-8 rounded-full bg-gradient-to-b from-white/25 to-transparent"
          aria-hidden
        />

        <p className="relative z-10 mb-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.35em] text-casino-gold-neon/80">
          Vegas Neon · {PAYLINE_COUNT} lignes
        </p>

        <CoinRain
          active={showCoinRain}
          intensity={jackpotWin ? "jackpot" : "normal"}
        />

        {freeSpinMode && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.12),transparent_65%)]" />
        )}

        <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3">
          {columns.map(({ col, symbols, winningRows }) => (
            <SlotReelColumn
              key={col}
              columnIndex={col}
              symbols={[...symbols]}
              isColumnSpinning={spinningColumns[col]}
              isSpinning={isSpinning}
              winningRows={winningRows}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2 px-2">
          <div className="border-t border-b border-casino-gold-neon/25 shadow-[0_0_12px_rgba(255,215,0,0.35)]" />
        </div>
      </div>
    </div>
  );
}
