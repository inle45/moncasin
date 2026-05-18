"use client";

import { JACKPOT_MIN_BET } from "@/utils/jackpot/constants";
import type { JackpotRoundStatus } from "@/utils/jackpot/types";
import { cn } from "@/utils/cn";

interface JackpotBetPanelProps {
  betAmount: number;
  onBetAmountChange: (value: number) => void;
  onPlaceBet: () => void;
  canBet: boolean;
  hasBet: boolean;
  roundStatus: JackpotRoundStatus;
  balance: number;
  isSubmitting: boolean;
  isDemoMode: boolean;
}

export function JackpotBetPanel({
  betAmount,
  onBetAmountChange,
  onPlaceBet,
  canBet,
  hasBet,
  roundStatus,
  balance,
  isSubmitting,
  isDemoMode,
}: JackpotBetPanelProps) {
  const arenaClosed =
    roundStatus === "rolling" || roundStatus === "ended";
  const inputLocked = hasBet || arenaClosed || isSubmitting;

  return (
    <div className="rounded-2xl border border-casino-purple-neon/30 bg-zinc-950/90 p-4 shadow-neon-purple backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-wider text-casino-gold-neon/90">
        Ta mise
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min={JACKPOT_MIN_BET}
          step={10}
          value={betAmount}
          disabled={inputLocked}
          onChange={(e) =>
            onBetAmountChange(Math.max(JACKPOT_MIN_BET, Number(e.target.value) || 0))
          }
          className={cn(
            "flex-1 rounded-xl border border-white/10 bg-black/50 px-4 py-3",
            "font-display text-lg font-bold tabular-nums text-casino-gold-neon",
            "focus:border-casino-purple-neon/50 focus:outline-none focus:ring-1 focus:ring-casino-purple-neon/40",
            inputLocked && "opacity-50"
          )}
        />
        <span className="flex items-center text-lg" aria-hidden>
          🪙
        </span>
      </div>

      <p className="mt-2 text-[11px] text-white/40">
        Solde : {balance.toLocaleString("fr-FR")} jetons · Min. {JACKPOT_MIN_BET}
      </p>

      {isDemoMode && (
        <p className="mt-2 text-center text-[10px] text-amber-200/80">
          Connecte-toi pour entrer dans l&apos;Arène
        </p>
      )}

      <button
        type="button"
        disabled={!canBet}
        onClick={onPlaceBet}
        className={cn(
          "mt-4 w-full rounded-xl py-3.5 font-display text-sm font-extrabold uppercase tracking-wide",
          "border-2 border-casino-gold-neon/60 bg-gradient-to-r from-violet-600 via-casino-purple to-fuchsia-600 text-white",
          "shadow-neon-purple transition active:scale-[0.98]",
          canBet && "hover:brightness-110",
          !canBet && "cursor-not-allowed opacity-45"
        )}
      >
        {isSubmitting
          ? "Entrée en cours…"
          : hasBet
            ? "Mise verrouillée"
            : arenaClosed
              ? "Arène fermée"
              : betAmount > balance
                ? "Solde insuffisant"
                : betAmount < JACKPOT_MIN_BET
                  ? `Min. ${JACKPOT_MIN_BET} jetons`
                  : "Entrer dans l'Arène"}
      </button>
    </div>
  );
}
