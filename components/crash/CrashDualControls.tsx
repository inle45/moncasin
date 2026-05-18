"use client";

import type { CrashBetSlotUI } from "@/utils/crash/bet-slot";
import type { CrashPhase } from "@/utils/crash/types";
import { CrashBetPanel } from "./CrashBetPanel";
import { cn } from "@/utils/cn";

interface CrashDualControlsProps {
  betSlots: [CrashBetSlotUI, CrashBetSlotUI];
  phase: CrashPhase;
  multiplier: number;
  bettingSecondsLeft: number | null;
  isDemoMode: boolean;
  canPlaceBet: (slot: 0 | 1) => boolean;
  canCashout: (slot: 0 | 1) => boolean;
  onBetChange: (slot: 0 | 1, delta: number) => void;
  onPlaceBet: (slot: 0 | 1) => void;
  onCashout: (slot: 0 | 1) => void;
  onAutoCashoutChange: (slot: 0 | 1, value: string) => void;
}

export function CrashDualControls({
  betSlots,
  phase,
  multiplier,
  bettingSecondsLeft,
  isDemoMode,
  canPlaceBet,
  canCashout,
  onBetChange,
  onPlaceBet,
  onCashout,
  onAutoCashoutChange,
}: CrashDualControlsProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t border-casino-purple-neon/30",
        "bg-gradient-to-t from-black via-zinc-950/98 to-transparent",
        "px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl"
      )}
    >
      <div className="mx-auto grid max-w-lg grid-cols-2 gap-2 sm:max-w-2xl sm:gap-3">
        {([0, 1] as const).map((slotIndex) => (
          <CrashBetPanel
            key={slotIndex}
            slotIndex={slotIndex}
            slot={betSlots[slotIndex]}
            phase={phase}
            multiplier={multiplier}
            canPlaceBet={canPlaceBet(slotIndex)}
            canCashout={canCashout(slotIndex)}
            bettingSecondsLeft={bettingSecondsLeft}
            isDemoMode={isDemoMode}
            onBetChange={(delta) => onBetChange(slotIndex, delta)}
            onPlaceBet={() => onPlaceBet(slotIndex)}
            onCashout={() => onCashout(slotIndex)}
            onAutoCashoutChange={(value) => onAutoCashoutChange(slotIndex, value)}
          />
        ))}
      </div>
    </div>
  );
}
