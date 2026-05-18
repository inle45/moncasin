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

export function parseAutoCashoutTarget(input: string): number | null {
  const t = input.trim().replace(",", ".");
  if (!t) return null;
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n < 1.01) return null;
  return Math.round(n * 100) / 100;
}
