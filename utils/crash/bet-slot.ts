import { DEFAULT_CRASH_BET } from "@/utils/crash/constants";

export type CrashBetSlotIndex = 0 | 1;

export interface CrashBetSlotUI {
  betAmount: number;
  autoCashoutInput: string;
  hasPlacedBet: boolean;
  hasCashedOut: boolean;
  betId: string | null;
  lockedBetAmount: number;
}

export function createDefaultBetSlots(): [CrashBetSlotUI, CrashBetSlotUI] {
  const empty = (): CrashBetSlotUI => ({
    betAmount: DEFAULT_CRASH_BET,
    autoCashoutInput: "",
    hasPlacedBet: false,
    hasCashedOut: false,
    betId: null,
    lockedBetAmount: 0,
  });
  return [empty(), empty()];
}

/** Parse la cible auto-cashout saisie (2 décimales, ignore si ≤ 1.0). */
export function parseAutoCashoutFromInput(input: string): number | null {
  const t = String(input ?? "").trim().replace(",", ".");
  if (!t) return null;
  const target = parseFloat(t);
  if (Number.isNaN(target) || target <= 1.0) return null;
  return Math.round(target * 100) / 100;
}

/** @deprecated Utiliser parseAutoCashoutFromInput */
export function parseAutoCashoutTarget(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input <= 1.0) return null;
    return Math.round(input * 100) / 100;
  }
  return parseAutoCashoutFromInput(input);
}
