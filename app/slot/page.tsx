"use client";

import { JackpotBar } from "@/components/slot/JackpotBar";
import { SlotControls } from "@/components/slot/SlotControls";
import { SlotReels } from "@/components/slot/SlotReels";
import { SlotTopBar } from "@/components/slot/SlotTopBar";
import { StatusBanner } from "@/components/slot/StatusBanner";
import { useSlotMachine } from "@/hooks/useSlotMachine";
import { PAYLINE_COUNT } from "@/utils/slot/constants";
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
    showCoinRain,
    autoSpinActive,
    autoSpinsLeft,
    jackpotPools,
    jackpotsLoading,
    spin,
    changeBet,
    toggleAutoSpin,
    profileLoading,
    isSyncing,
    profileError,
    isDemoMode,
  } = useSlotMachine();

  const canSpin =
    !profileLoading && !isSyncing && (balance >= bet || freeSpinsLeft > 0);
  const pulseJackpot = lastResult?.jackpotWin?.tier ?? null;

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen max-w-lg pb-52 transition-colors duration-700 sm:max-w-2xl",
        "bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.2),transparent_50%),#0B0813]",
        freeSpinMode &&
          "bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.25),transparent_55%),#050810]"
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
          Mode démo · jackpots progressifs locaux
        </p>
      )}

      <header className="px-4 pb-2 pt-1 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-casino-gold-neon/70">
          Las Vegas Edition
        </p>
        <h1 className="font-display text-xl font-bold text-white">
          Machine à Sous{" "}
          <span className="bg-gradient-to-r from-casino-gold-neon to-casino-purple-glow bg-clip-text text-transparent">
            Neon
          </span>
        </h1>
        <p className="text-[10px] text-white/40">
          3×3 · {PAYLINE_COUNT} lignes · Wild 🃏 · Free Spins ⭐
        </p>
      </header>

      <JackpotBar
        pools={jackpotPools}
        pulseTier={pulseJackpot}
        isLoading={jackpotsLoading}
      />

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
          showCoinRain={showCoinRain}
          jackpotWin={!!lastResult?.jackpotWin}
        />
      </div>

      <SlotControls
        bet={bet}
        isSpinning={isSpinning}
        canSpin={canSpin}
        freeSpinsLeft={freeSpinsLeft}
        autoSpinActive={autoSpinActive}
        autoSpinsLeft={autoSpinsLeft}
        onBetChange={changeBet}
        onSpin={spin}
        onToggleAutoSpin={toggleAutoSpin}
      />

      <div
        className="pointer-events-none fixed -left-24 top-1/4 h-56 w-56 rounded-full bg-casino-purple/30 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-20 bottom-1/3 h-48 w-48 rounded-full bg-casino-gold/20 blur-[90px]"
        aria-hidden
      />
    </div>
  );
}
