"use client";

import { CRASH_BET_OPTIONS } from "@/utils/crash/constants";
import { formatMultiplier } from "@/utils/crash/engine";
import type { CrashBetSlotUI } from "@/utils/crash/bet-slot";
import type { CrashPhase } from "@/utils/crash/types";
import { cn } from "@/utils/cn";

interface CrashBetPanelProps {
  slotIndex: 0 | 1;
  slot: CrashBetSlotUI;
  phase: CrashPhase;
  multiplier: number;
  canPlaceBet: boolean;
  canCashout: boolean;
  bettingSecondsLeft: number | null;
  isDemoMode: boolean;
  onBetChange: (delta: number) => void;
  onPlaceBet: () => void;
  onCashout: () => void;
  onAutoCashoutChange: (value: string) => void;
}

export function CrashBetPanel({
  slotIndex,
  slot,
  phase,
  multiplier,
  canPlaceBet,
  canCashout,
  bettingSecondsLeft,
  isDemoMode,
  onBetChange,
  onPlaceBet,
  onCashout,
  onAutoCashoutChange,
}: CrashBetPanelProps) {
  const betIndex = CRASH_BET_OPTIONS.indexOf(
    slot.betAmount as (typeof CRASH_BET_OPTIONS)[number]
  );
  const isBetting = phase === "betting";
  const potentialWin = Math.floor(
    (slot.lockedBetAmount || slot.betAmount) * multiplier
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-casino-purple-neon/25 bg-zinc-950/80 p-2.5 shadow-neon-purple backdrop-blur-md sm:p-3">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90">
          Mise {slotIndex + 1}
        </span>
        {slot.hasPlacedBet && !slot.hasCashedOut && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
            Active
          </span>
        )}
        {slot.hasCashedOut && (
          <span className="rounded bg-casino-gold/15 px-1.5 py-0.5 text-[9px] font-semibold text-casino-gold-neon">
            Encaissé
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-white/40">
          Auto-cashout
        </span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="ex: 2.00"
          value={slot.autoCashoutInput}
          disabled={slot.hasPlacedBet}
          onChange={(e) => onAutoCashoutChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-white/10 bg-black/50 px-2 py-1.5",
            "font-mono text-sm text-cyan-100 placeholder:text-white/25",
            "focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30",
            slot.hasPlacedBet && "opacity-50"
          )}
        />
      </label>

      {isBetting && !slot.hasPlacedBet && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900/60 p-2">
          <button
            type="button"
            disabled={betIndex <= 0}
            onClick={() => onBetChange(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-800 text-base font-bold disabled:opacity-30"
            aria-label="Diminuer la mise"
          >
            −
          </button>
          <span className="font-display text-lg font-bold tabular-nums text-casino-gold-neon">
            {slot.betAmount}
          </span>
          <button
            type="button"
            disabled={betIndex >= CRASH_BET_OPTIONS.length - 1}
            onClick={() => onBetChange(1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-800 text-base font-bold disabled:opacity-30"
            aria-label="Augmenter la mise"
          >
            +
          </button>
        </div>
      )}

      {slot.hasPlacedBet && isBetting && (
        <p className="text-center text-[10px] text-casino-gold-neon/90">
          Décollage {bettingSecondsLeft ?? "…"}s
        </p>
      )}

      {isDemoMode && isBetting && !slot.hasPlacedBet && (
        <p className="text-center text-[9px] text-amber-200/70">Mode local</p>
      )}

      {canCashout ? (
        <button
          type="button"
          onClick={onCashout}
          className={cn(
            "w-full rounded-xl py-3",
            "border-2 border-emerald-400/70 bg-gradient-to-b from-emerald-400 to-emerald-700",
            "font-display text-sm font-black uppercase tracking-wide text-zinc-950",
            "shadow-[0_0_24px_rgba(52,211,153,0.4)] active:scale-[0.98]"
          )}
        >
          <span className="block text-[10px] opacity-80">Cashout</span>
          <span className="block text-lg tabular-nums">
            {formatMultiplier(multiplier)}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold normal-case">
            +{potentialWin.toLocaleString("fr-FR")}
          </span>
        </button>
      ) : (
        <button
          type="button"
          disabled={!canPlaceBet}
          onClick={onPlaceBet}
          className={cn(
            "w-full rounded-xl py-3 font-display text-sm font-extrabold uppercase tracking-wide",
            "border border-casino-gold-neon/50 bg-gradient-to-r from-casino-purple to-violet-600 text-white",
            canPlaceBet && "hover:brightness-110 active:scale-[0.98]",
            !canPlaceBet && "cursor-not-allowed opacity-45"
          )}
        >
          {phase === "flying"
            ? "En vol…"
            : phase === "crashed"
              ? "Attente…"
              : slot.hasPlacedBet
                ? "Placée"
                : "Miser"}
        </button>
      )}
    </div>
  );
}