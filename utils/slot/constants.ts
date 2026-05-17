import type { JackpotTier, SlotSymbol, SlotSymbolId } from "./types";
import { PAYLINE_COUNT, buildPaylines } from "./paylines";

export const INITIAL_BALANCE = 1000;

export const BET_OPTIONS = [10, 25, 50, 100, 250] as const;

export const DEFAULT_BET = 25;

export const FREE_SPINS_AWARD = 10;

export const FREE_SPIN_MULTIPLIER = 2;

export const SCATTER_TRIGGER_COUNT = 3;

export const SYMBOLS: Record<SlotSymbolId, SlotSymbol> = {
  cherry: { id: "cherry", emoji: "🍒", label: "Cerise" },
  clover: { id: "clover", emoji: "🍀", label: "Trèfle" },
  seven: { id: "seven", emoji: "7️⃣", label: "Sept" },
  crown: { id: "crown", emoji: "👑", label: "Couronne" },
  diamond: { id: "diamond", emoji: "💎", label: "Diamant" },
  i4z: { id: "i4z", emoji: "🃏", label: "Joker Wild" },
  scatter: { id: "scatter", emoji: "⭐️", label: "Scatter" },
};

/** Poids de tirage (plus élevé = plus fréquent) */
export const SYMBOL_WEIGHTS: Record<SlotSymbolId, number> = {
  cherry: 28,
  clover: 22,
  seven: 18,
  crown: 12,
  diamond: 8,
  i4z: 6,
  scatter: 6,
};

/** Multiplicateur de mise par ligne (3 symboles identiques) */
export const LINE_PAYOUTS: Record<SlotSymbolId, number> = {
  cherry: 3,
  clover: 5,
  seven: 8,
  crown: 12,
  diamond: 20,
  i4z: 25,
  scatter: 0,
};

export const PAYLINES = buildPaylines();
export { PAYLINE_COUNT };

export const JACKPOT_TIERS: {
  tier: JackpotTier;
  label: string;
  multiplier: number;
  symbol: SlotSymbolId;
  glow: string;
  border: string;
  text: string;
}[] = [
  {
    tier: "mini",
    label: "Mini",
    multiplier: 50,
    symbol: "clover",
    glow: "shadow-[0_0_20px_rgba(255,215,0,0.5)]",
    border: "border-amber-400/50",
    text: "text-amber-300",
  },
  {
    tier: "minor",
    label: "Minor",
    multiplier: 150,
    symbol: "seven",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.5)]",
    border: "border-red-400/50",
    text: "text-red-300",
  },
  {
    tier: "major",
    label: "Major",
    multiplier: 500,
    symbol: "crown",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.55)]",
    border: "border-violet-400/50",
    text: "text-violet-300",
  },
  {
    tier: "grand",
    label: "Grand",
    multiplier: 2000,
    symbol: "diamond",
    glow: "shadow-[0_0_24px_rgba(59,130,246,0.55)]",
    border: "border-blue-400/50",
    text: "text-blue-300",
  },
];

export const SPIN_DURATION_MS = 2200;
export const REEL_STAGGER_MS = 280;

export const AUTO_SPIN_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_AUTO_SPINS = 25;
