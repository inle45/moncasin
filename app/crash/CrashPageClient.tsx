"use client";

import {
  CrashCanvas,
  CrashControls,
  CrashHeader,
  CrashPlayersList,
} from "@/components/crash";
import { useCrashGame } from "@/hooks/useCrashGame";
import { cn } from "@/utils/cn";

export default function CrashPageClient() {
  const {
    balance,
    bet,
    phase,
    multiplier,
    crashPoint,
    message,
    crashHistory,
    curvePoints,
    canPlaceBet,
    canCashout,
    potentialWin,
    bettingSecondsLeft,
    roundBets,
    activePlayersCount,
    hasPlacedBet,
    hasCashedOut,
    connected,
    roundNumber,
    profileLoading,
    isSyncing,
    isDemoMode,
    placeBet,
    cashout,
    changeBet,
  } = useCrashGame();

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen max-w-lg pb-56 sm:max-w-2xl",
        "bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.22),transparent_55%),#0B0813]"
      )}
    >
      <CrashHeader balance={balance} isLoading={profileLoading} />

      {message && (
        <p
          className={cn(
            "mx-4 mt-3 animate-auth-message rounded-xl border px-4 py-2.5 text-center text-sm font-semibold backdrop-blur-xl",
            hasCashedOut
              ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
              : phase === "crashed"
                ? "border-red-400/40 bg-red-500/15 text-red-100"
                : "border-casino-gold/30 bg-casino-gold/10 text-casino-gold-neon"
          )}
          role="status"
        >
          {message}
        </p>
      )}

      <div className="mt-4 space-y-4">
        <CrashCanvas
          multiplier={multiplier}
          phase={phase}
          crashPoint={crashPoint}
          curvePoints={curvePoints}
          history={crashHistory}
          bettingSecondsLeft={bettingSecondsLeft}
          roundNumber={roundNumber}
        />

        <CrashPlayersList
          bets={roundBets}
          phase={phase}
          activeCount={activePlayersCount}
          connected={connected}
        />
      </div>

      <CrashControls
        bet={bet}
        phase={phase}
        multiplier={multiplier}
        potentialWin={potentialWin}
        canPlaceBet={canPlaceBet}
        canCashout={canCashout}
        hasPlacedBet={hasPlacedBet}
        bettingSecondsLeft={bettingSecondsLeft}
        isDemoMode={isDemoMode}
        onBetChange={changeBet}
        onPlaceBet={placeBet}
        onCashout={cashout}
      />

      <div
        className="pointer-events-none fixed -left-20 top-1/3 h-52 w-52 rounded-full bg-casino-purple/25 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-16 bottom-1/4 h-44 w-44 rounded-full bg-casino-gold/15 blur-[90px]"
        aria-hidden
      />
    </div>
  );
}
