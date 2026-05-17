"use client";

import { CrashCanvas, CrashControls, CrashHeader } from "@/components/crash";
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
    profileLoading,
    isSyncing,
    profileError,
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
      <CrashHeader
        balance={balance}
        isLoading={profileLoading || isSyncing}
      />

      {profileError && (
        <p className="mx-4 mt-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-center text-xs text-red-200">
          {profileError}
        </p>
      )}

      {isDemoMode && !profileLoading && (
        <p className="mx-4 mt-2 rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-[11px] text-casino-gold-neon">
          Mode démo · solde synchronisé localement
        </p>
      )}

      {message && (
        <p
          className={cn(
            "mx-4 mt-3 animate-auth-message rounded-xl border px-4 py-2.5 text-center text-sm font-semibold backdrop-blur-xl",
            phase === "cashed_out"
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
        />
      </div>

      <CrashControls
        bet={bet}
        phase={phase}
        multiplier={multiplier}
        potentialWin={potentialWin}
        canPlaceBet={canPlaceBet}
        canCashout={canCashout}
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
