"use client";

import { cn } from "@/utils/cn";

interface SpinButtonProps {
  canSpin: boolean;
  isSpinning: boolean;
  countdown: string;
  onSpin: () => void;
}

export function SpinButton({
  canSpin,
  isSpinning,
  countdown,
  onSpin,
}: SpinButtonProps) {
  const locked = !canSpin && !isSpinning;

  return (
    <button
      type="button"
      onClick={onSpin}
      disabled={!canSpin || isSpinning}
      aria-label={
        isSpinning
          ? "La roue tourne"
          : locked
            ? `Prochain tour dans ${countdown}`
            : "Lancer la roue quotidienne"
      }
      className={cn(
        "relative z-30 flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full",
        "border-2 font-display text-sm font-black uppercase tracking-wider",
        "transition-all duration-300 active:scale-95 sm:h-[80px] sm:w-[80px]",
        canSpin && !isSpinning
          ? cn(
              "border-casino-gold-neon bg-gradient-to-br from-casino-gold via-amber-400 to-casino-gold-dim",
              "text-casino-bg shadow-[0_0_28px_rgba(255,215,0,0.55)]",
              "animate-spin-pulse hover:brightness-110"
            )
          : cn(
              "border-white/15 bg-casino-surface/90 text-white/50",
              "cursor-not-allowed shadow-none"
            )
      )}
    >
      {isSpinning ? (
        <span className="text-[10px] leading-tight text-casino-bg/80">
          …
        </span>
      ) : locked ? (
        <>
          <span className="text-[8px] font-semibold normal-case tracking-normal text-white/40">
            Dans
          </span>
          <span className="mt-0.5 font-mono text-[10px] font-bold tabular-nums text-casino-purple-glow">
            {countdown}
          </span>
        </>
      ) : (
        "LANCER"
      )}
    </button>
  );
}
