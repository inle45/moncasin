"use client";

import { BET_OPTIONS } from "@/utils/slot/constants";
import { cn } from "@/utils/cn";

interface SlotControlsProps {
  bet: number;
  isSpinning: boolean;
  canSpin: boolean;
  freeSpinsLeft: number;
  autoSpinActive: boolean;
  autoSpinsLeft: number;
  onBetChange: (delta: number) => void;
  onSpin: () => void;
  onToggleAutoSpin: () => void;
}

export function SlotControls({
  bet,
  isSpinning,
  canSpin,
  freeSpinsLeft,
  autoSpinActive,
  autoSpinsLeft,
  onBetChange,
  onSpin,
  onToggleAutoSpin,
}: SlotControlsProps) {
  const betIndex = BET_OPTIONS.indexOf(bet as (typeof BET_OPTIONS)[number]);
  const isMinBet = betIndex <= 0;
  const isMaxBet = betIndex >= BET_OPTIONS.length - 1;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-casino-gold/20",
        "bg-gradient-to-t from-black via-zinc-950/95 to-zinc-900/90",
        "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-3 sm:max-w-2xl">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Mise
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSpinning || isMinBet || autoSpinActive}
              onClick={() => onBetChange(-1)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border border-casino-gold/30",
                "bg-zinc-800 text-lg font-bold text-casino-gold-neon",
                "transition-all hover:bg-zinc-700 active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-30"
              )}
              aria-label="Diminuer la mise"
            >
              −
            </button>
            <span className="min-w-[4rem] text-center font-display text-xl font-bold tabular-nums text-casino-gold-neon">
              {bet}
            </span>
            <button
              type="button"
              disabled={isSpinning || isMaxBet || autoSpinActive}
              onClick={() => onBetChange(1)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border border-casino-gold/30",
                "bg-zinc-800 text-lg font-bold text-casino-gold-neon",
                "transition-all hover:bg-zinc-700 active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-30"
              )}
              aria-label="Augmenter la mise"
            >
              +
            </button>
          </div>
          {freeSpinsLeft > 0 && (
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-cyan-300">
              Free · {freeSpinsLeft}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            disabled={!canSpin || isSpinning}
            onClick={onSpin}
            className={cn(
              "relative overflow-hidden rounded-2xl py-4 font-display text-xl font-extrabold uppercase tracking-[0.15em]",
              "border-2 border-casino-gold-neon/60",
              "bg-gradient-to-b from-amber-400 via-casino-gold to-amber-700 text-zinc-950",
              "shadow-[0_0_28px_rgba(255,215,0,0.4),inset_0_2px_0_rgba(255,255,255,0.35)]",
              !isSpinning && canSpin && "animate-spin-pulse hover:brightness-110 active:scale-[0.98]",
              (isSpinning || !canSpin) && "cursor-not-allowed opacity-50"
            )}
          >
            {isSpinning ? "…" : freeSpinsLeft > 0 ? "FREE SPIN" : "SPIN"}
          </button>

          <button
            type="button"
            disabled={isSpinning && !autoSpinActive}
            onClick={onToggleAutoSpin}
            className={cn(
              "flex min-w-[5.5rem] flex-col items-center justify-center rounded-2xl px-3 py-2",
              "border-2 font-display text-xs font-bold uppercase tracking-wider",
              autoSpinActive
                ? "border-red-400/60 bg-red-950/80 text-red-200"
                : "border-casino-purple-neon/50 bg-violet-950/80 text-casino-purple-glow"
            )}
          >
            <span>{autoSpinActive ? "STOP" : "AUTO"}</span>
            {autoSpinActive && (
              <span className="mt-0.5 font-mono text-[10px] tabular-nums">
                {autoSpinsLeft}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
