"use client";

import {
  RoueHeader,
  SpinButton,
  WheelResultToast,
  WheelVisual,
} from "@/components/roue";
import { useDailyWheel } from "@/hooks/useDailyWheel";
import { cn } from "@/utils/cn";

export default function RouePage() {
  const {
    balance,
    loading,
    isDemoMode,
    rotation,
    isSpinning,
    canSpin,
    countdown,
    toast,
    spin,
    resetCooldownDemo,
  } = useDailyWheel();

  const onCooldown = !canSpin && !isSpinning && !loading;

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-casino-bg pb-10 sm:max-w-2xl">
      <WheelResultToast
        kind={toast?.kind ?? "win"}
        message={toast?.message ?? ""}
        amount={toast?.amount ?? 0}
        visible={!!toast}
      />

      <RoueHeader balance={balance} isLoading={loading} />

      {isDemoMode && !loading && (
        <p className="mx-4 mt-2 rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-[11px] text-casino-gold-neon">
          Mode démo · solde et cooldown sauvegardés localement
        </p>
      )}

      <section className="relative mt-6 px-4">
        <div className="relative mx-auto w-full max-w-[min(92vw,340px)]">
          <WheelVisual rotation={rotation} isSpinning={isSpinning} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto">
              <SpinButton
                canSpin={canSpin}
                isSpinning={isSpinning}
                countdown={countdown}
                onSpin={spin}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 px-4 text-center">
        {onCooldown ? (
          <>
            <p className="text-xs text-white/50">
              Prochain tour gratuit dans
            </p>
            <p className="mt-1 font-mono text-lg font-bold tabular-nums text-casino-purple-glow">
              {countdown}
            </p>
            {isDemoMode && (
              <button
                type="button"
                onClick={resetCooldownDemo}
                className="mt-3 text-[10px] text-white/30 underline-offset-2 hover:text-casino-gold-neon hover:underline"
              >
                Réinitialiser le cooldown (démo)
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-white/40">
            {isSpinning
              ? "La roue tourne…"
              : "Appuie sur LANCER pour tenter ta chance !"}
          </p>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-none fixed -left-20 top-1/4 h-48 w-48 rounded-full bg-casino-purple/25 blur-[100px]"
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none fixed -right-16 bottom-1/3 h-40 w-40 rounded-full bg-casino-gold/15 blur-[80px]"
        )}
        aria-hidden
      />
    </div>
  );
}
