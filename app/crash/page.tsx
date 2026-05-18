"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import {
  CrashCanvas,
  CrashDualControls,
  CrashHeader,
  CrashPlayersList,
} from "@/components/crash";
import { useCrashGame } from "@/hooks/useCrashGame";
import { cn } from "@/utils/cn";

export default function CrashPage() {
  const {
    balance,
    betSlots,
    phase,
    multiplier,
    crashPoint,
    message,
    crashHistory,
    curvePoints,
    crashFlash,
    bettingSecondsLeft,
    roundBets,
    activePlayersCount,
    connected,
    roundNumber,
    isDemoMode,
    tickError,
    canPlaceBetForSlot,
    canCashoutForSlot,
    placeBetForSlot,
    cashoutForSlot,
    changeBetForSlot,
    setAutoCashoutForSlot,
  } = useCrashGame();

  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen max-w-lg pb-[22rem] sm:max-w-2xl",
        "bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.22),transparent_55%),#0B0813]"
      )}
    >
      <Header />
      <div className="px-4">
        <CrashHeader balance={balance} isLoading={false} />
      </div>

      {message && (
        <p
          className="mx-4 mt-2 rounded-xl border border-casino-gold/30 bg-casino-gold/10 px-4 py-2 text-center text-sm text-casino-gold-neon"
          role="status"
        >
          {message}
        </p>
      )}

      {tickError && (
        <p
          className="mx-4 mt-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-center text-[11px] text-amber-100/90"
          role="alert"
        >
          Sync manche : {tickError}
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
          crashFlash={crashFlash}
        />

        <CrashPlayersList
          bets={roundBets}
          phase={phase}
          activeCount={activePlayersCount}
          connected={connected}
        />

        <CrashDualControls
          betSlots={betSlots}
          phase={phase}
          multiplier={multiplier}
          bettingSecondsLeft={bettingSecondsLeft}
          isDemoMode={isDemoMode}
          canPlaceBet={canPlaceBetForSlot}
          canCashout={canCashoutForSlot}
          onBetChange={changeBetForSlot}
          onPlaceBet={placeBetForSlot}
          onCashout={cashoutForSlot}
          onAutoCashoutChange={setAutoCashoutForSlot}
        />
      </div>
    </div>
  );
}
