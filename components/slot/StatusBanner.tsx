"use client";

import { cn } from "@/utils/cn";

interface StatusBannerProps {
  message: string | null;
  freeSpinMode: boolean;
  comboCount: number;
}

export function StatusBanner({
  message,
  freeSpinMode,
  comboCount,
}: StatusBannerProps) {
  if (!message && !freeSpinMode && comboCount === 0) return null;

  return (
    <div className="mx-4 mb-3 min-h-[2.5rem]">
      {freeSpinMode && (
        <div
          className={cn(
            "mb-2 flex items-center justify-center gap-2 rounded-xl border border-cyan-400/40",
            "bg-cyan-500/10 px-4 py-2 backdrop-blur-xl"
          )}
        >
          <span className="animate-pulse text-lg" aria-hidden>
            ⭐️
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Mode Free Spins · Multiplicateur ×2
          </span>
        </div>
      )}

      {message && (
        <p
          className={cn(
            "rounded-xl border px-4 py-2 text-center text-sm font-semibold backdrop-blur-xl transition-all",
            message.includes("FREE")
              ? "border-yellow-400/50 bg-yellow-500/15 text-yellow-200"
              : message.includes("JACKPOT")
                ? "border-blue-400/50 bg-blue-500/15 text-blue-200"
                : message.includes("insuffisant")
                  ? "border-red-400/50 bg-red-500/15 text-red-200"
                  : "border-casino-gold/40 bg-casino-gold/10 text-casino-gold-neon"
          )}
        >
          {message}
        </p>
      )}

      {comboCount >= 2 && !message?.includes("COMBO") && (
        <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-casino-purple-glow">
          Combo ×{comboCount} lignes !
        </p>
      )}
    </div>
  );
}
