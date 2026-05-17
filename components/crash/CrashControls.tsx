"use client";

import { CRASH_BET_OPTIONS } from "@/utils/crash/constants";
import { formatMultiplier } from "@/utils/crash/engine";
import type { CrashPhase } from "@/hooks/useCrashGame";
import { cn } from "@/utils/cn";

interface CrashControlsProps {
  bet: number;
  phase: CrashPhase;
  multiplier: number;
  potentialWin: number;
  canPlaceBet: boolean;
  canCashout: boolean;
  onBetChange: (delta: number) => void;
  onPlaceBet: () => void;
  onCashout: () => void;
}

export function CrashControls({
  bet,
  phase,
  multiplier,
  potentialWin,
  canPlaceBet,
  canCashout,
  onBetChange,
  onPlaceBet,
  onCashout,
}: CrashControlsProps) {
  const betIndex = CRASH_BET_OPTIONS.indexOf(
    bet as (typeof CRASH_BET_OPTIONS)[number]
  );
  const isIdle = phase === "idle";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-casino-purple-neon/20",
        "bg-gradient-to-t from-black via-zinc-950/98 to-transparent",
        "px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto max-w-lg space-y-3 sm:max-w-2xl">
        {isIdle && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/70 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Mise
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={betIndex <= 0}
                onClick={() => onBetChange(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-lg font-bold disabled:opacity-30"
                aria-label="Diminuer la mise"
              >
                −
              </button>
              <span className="min-w-[4rem] text-center font-display text-xl font-bold tabular-nums text-casino-gold-neon">
                {bet}
              </span>
              <button
                type="button"
                disabled={betIndex >= CRASH_BET_OPTIONS.length - 1}
                onClick={() => onBetChange(1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-zinc-800 text-lg font-bold disabled:opacity-30"
                aria-label="Augmenter la mise"
              >
                +
              </button>
            </div>
          </div>
        )}

        {canCashout ? (
          <button
            type="button"
            onClick={onCashout}
            className={cn(
              "relative w-full overflow-hidden rounded-2xl py-5",
              "border-2 border-emerald-400/70 bg-gradient-to-b from-emerald-400 to-emerald-700",
              "font-display text-lg font-black uppercase tracking-wider text-zinc-950",
              "shadow-[0_0_32px_rgba(52,211,153,0.45)] animate-pulse-glow active:scale-[0.98]"
            )}
          >
            <span className="block text-sm opacity-80">Cashout</span>
            <span className="block text-2xl tabular-nums">
              {formatMultiplier(multiplier)}
            </span>
            <span className="mt-1 block text-xs font-semibold normal-case opacity-90">
              +{potentialWin.toLocaleString("fr-FR")} jetons
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!canPlaceBet}
            onClick={onPlaceBet}
            className={cn(
              "w-full rounded-2xl py-4 font-display text-lg font-extrabold uppercase tracking-[0.12em]",
              "border-2 border-casino-gold-neon/60",
              "bg-gradient-to-r from-casino-purple via-casino-purple-neon to-casino-gold/90 text-white",
              "shadow-neon-purple transition-all",
              canPlaceBet && "animate-spin-pulse hover:brightness-110 active:scale-[0.98]",
              !canPlaceBet && "cursor-not-allowed opacity-45"
            )}
          >
            {phase === "flying" ? "En vol…" : "Placer la mise"}
          </button>
        )}
      </div>
    </div>
  );
}
