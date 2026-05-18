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

/** Parse la cible auto-cashout (nombre strict, 2 décimales). */
export function parseAutoCashoutTarget(input: string | number): number | null {
  const t =
    typeof input === "number"
      ? String(input)
      : String(input ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 1.01) return null;
  return Math.round(n * 100) / 100;
}
