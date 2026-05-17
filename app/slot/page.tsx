"use client";

import { JackpotBar } from "@/components/slot/JackpotBar";
import { SlotControls } from "@/components/slot/SlotControls";
import { SlotReels } from "@/components/slot/SlotReels";
import { SlotTopBar } from "@/components/slot/SlotTopBar";
import { StatusBanner } from "@/components/slot/StatusBanner";
import { useSlotMachine } from "@/hooks/useSlotMachine";
import { cn } from "@/utils/cn";

export default function SlotPage() {
  const {
    balance,
    bet,
    displayGrid,
    isSpinning,
    freeSpinsLeft,
    freeSpinMode,
    lastResult,
    winMessage,
    comboCount,
    winningCells,
    spin,
    changeBet,
    profileLoading,
    isAuthenticated,
    isSyncing,
    profileError,
    isDemoMode,
  } = useSlotMachine();

  const canSpin =
    !profileLoading &&
    !isSyncing &&
    (balance >= bet || freeSpinsLeft > 0);
  const pulseJackpot = lastResult?.jackpotWin?.tier ?? null;

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen max-w-lg pb-44 transition-colors duration-700 sm:max-w-2xl",
        freeSpinMode && "bg-gradient-to-b from-cyan-950/30 via-[#0B0813] to-violet-950/20"
      )}
    >
      <SlotTopBar balance={balance} isLoading={profileLoading || isSyncing} />

      {profileError && (
        <p className="mx-4 mb-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
          {profileError}
        </p>
      )}

      {isDemoMode && !profileLoading && (
        <p className="mx-4 mb-2 rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-xs text-casino-gold-neon">
          Mode démo · 1000 jetons locaux (non sauvegardés en cloud)
        </p>
      )}

      <header className="px-4 pb-3 pt-1 text-center">
        <h1 className="font-display text-lg font-bold text-white">
          Machine à Sous
        </h1>
        <p className="text-[10px] text-white/40">3×3 · 5 lignes · Jackpots progressifs</p>
      </header>

      <JackpotBar bet={bet} pulseTier={pulseJackpot} />

      <div className="mt-4">
        <StatusBanner
          message={winMessage}
          freeSpinMode={freeSpinMode}
          comboCount={comboCount}
        />
        <SlotReels
          grid={displayGrid}
          isSpinning={isSpinning}
          winningCells={winningCells}
          freeSpinMode={freeSpinMode}
        />
      </div>

      <SlotControls
        bet={bet}
        isSpinning={isSpinning}
        canSpin={canSpin}
        freeSpinsLeft={freeSpinsLeft}
        onBetChange={changeBet}
        onSpin={spin}
      />
    </div>
  );
}
