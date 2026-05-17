"use client";

import { BET_OPTIONS } from "@/utils/slot/constants";
import { cn } from "@/utils/cn";

interface SlotControlsProps {
  bet: number;
  isSpinning: boolean;
  canSpin: boolean;
  freeSpinsLeft: number;
  onBetChange: (delta: number) => void;
  onSpin: () => void;
}

export function SlotControls({
  bet,
  isSpinning,
  canSpin,
  freeSpinsLeft,
  onBetChange,
  onSpin,
}: SlotControlsProps) {
  const betIndex = BET_OPTIONS.indexOf(bet as (typeof BET_OPTIONS)[number]);
  const isMinBet = betIndex <= 0;
  const isMaxBet = betIndex >= BET_OPTIONS.length - 1;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08]",
        "bg-casino-bg/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-4 sm:max-w-2xl">
        {/* Sélecteur de mise */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Mise
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSpinning || isMinBet}
              onClick={() => onBetChange(-1)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-bold",
                "transition-all hover:border-casino-purple-neon/40 active:scale-95",
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
              disabled={isSpinning || isMaxBet}
              onClick={() => onBetChange(1)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-bold",
                "transition-all hover:border-casino-purple-neon/40 active:scale-95",
                "disabled:cursor-not-allowed disabled:opacity-30"
              )}
              aria-label="Augmenter la mise"
            >
              +
            </button>
          </div>
          {freeSpinsLeft > 0 && (
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-cyan-300">
              Gratuit · {freeSpinsLeft}
            </span>
          )}
        </div>

        {/* Bouton SPIN */}
        <button
          type="button"
          disabled={!canSpin || isSpinning}
          onClick={onSpin}
          className={cn(
            "relative w-full overflow-hidden rounded-2xl py-4 font-display text-xl font-extrabold uppercase tracking-[0.2em]",
            "border-2 border-casino-gold-neon/50 transition-all duration-300",
            "bg-gradient-to-r from-casino-purple via-casino-purple-neon to-casino-gold/80 text-white",
            "shadow-neon-purple",
            !isSpinning && canSpin && "animate-spin-pulse hover:scale-[1.02] active:scale-[0.98]",
            isSpinning && "opacity-80 scale-[0.98] cursor-wait",
            (!canSpin || isSpinning) && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="relative z-10">
            {isSpinning ? "…" : freeSpinsLeft > 0 ? "FREE SPIN" : "SPIN"}
          </span>
          {!isSpinning && canSpin && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity hover:opacity-100" />
          )}
        </button>
      </div>
    </div>
  );
}
