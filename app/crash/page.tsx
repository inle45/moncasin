"use client";

import Link from "next/link";
import {
  CrashCanvas,
  CrashControls,
  CrashHeader,
  CrashPlayersList,
} from "@/components/crash";
import { useCrashGame } from "@/hooks/useCrashGame";
import { cn } from "@/utils/cn";

export default function CrashPage() {
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
      <p className="px-4 pt-2 text-center text-[9px] font-bold uppercase tracking-widest text-emerald-400/90">
        Mode secours v3 · 59262f9
      </p>

      <CrashHeader balance={balance} isLoading={false} />

      {message && (
        <p
          className="mx-4 mt-2 rounded-xl border border-casino-gold/30 bg-casino-gold/10 px-4 py-2 text-center text-sm text-casino-gold-neon"
          role="status"
        >
          {message}
        </p>
      )}

      <Link
        href="/"
        className="mx-4 mt-2 inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"
      >
        ← Accueil
      </Link>

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

        <CrashControls
          bet={bet}
          phase={phase}
          multiplier={multiplier}
          potentialWin={potentialWin}
          canPlaceBet={canPlaceBet}
          canCashout={canCashout}
          hasPlacedBet={hasPlacedBet}
          bettingSecondsLeft={bettingSecondsLeft}
          isDemoMode={true}
          onBetChange={changeBet}
          onPlaceBet={placeBet}
          onCashout={cashout}
        />
      </div>
    </div>
  );
}
