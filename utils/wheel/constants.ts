export type WheelSegmentKind = "coins" | "jackpot" | "bankrupt";

export interface WheelSegment {
  id: string;
  label: string;
  shortLabel: string;
  amount: number;
  kind: WheelSegmentKind;
  color: string;
  textColor: string;
  weight: number;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: "coins-50",
    label: "50 jetons",
    shortLabel: "50",
    amount: 50,
    kind: "coins",
    color: "#3B0764",
    textColor: "#E9D5FF",
    weight: 22,
  },
  {
    id: "coins-100",
    label: "100 jetons",
    shortLabel: "100",
    amount: 100,
    kind: "coins",
    color: "#4C1D95",
    textColor: "#F3E8FF",
    weight: 20,
  },
  {
    id: "coins-250",
    label: "250 jetons",
    shortLabel: "250",
    amount: 250,
    kind: "coins",
    color: "#5B21B6",
    textColor: "#FAF5FF",
    weight: 16,
  },
  {
    id: "coins-500",
    label: "500 jetons",
    shortLabel: "500",
    amount: 500,
    kind: "coins",
    color: "#6D28D9",
    textColor: "#FFFFFF",
    weight: 12,
  },
  {
    id: "coins-1000",
    label: "1 000 jetons",
    shortLabel: "1K",
    amount: 1000,
    kind: "coins",
    color: "#7C3AED",
    textColor: "#FFD700",
    weight: 8,
  },
  {
    id: "jackpot",
    label: "JACKPOT",
    shortLabel: "JP",
    amount: 5000,
    kind: "jackpot",
    color: "#B8860B",
    textColor: "#1A0A00",
    weight: 2,
  },
  {
    id: "bankrupt",
    label: "Banqueroute",
    shortLabel: "0",
    amount: 0,
    kind: "bankrupt",
    color: "#450A0A",
    textColor: "#FCA5A5",
    weight: 12,
  },
  {
    id: "coins-150",
    label: "150 jetons",
    shortLabel: "150",
    amount: 150,
    kind: "coins",
    color: "#581C87",
    textColor: "#F5D0FE",
    weight: 8,
  },
];

export const SEGMENT_COUNT = WHEEL_SEGMENTS.length;
export const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

/** Durée de l'animation de rotation (ms) */
export const SPIN_ANIMATION_MS = 5200;

/** Délai avant affichage du toast après l'arrêt */
export const RESULT_TOAST_DELAY_MS = 400;

/** Cooldown entre deux tours gratuits */
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Nombre minimum de tours complets avant l'arrêt */
export const MIN_EXTRA_SPINS = 5;
export const MAX_EXTRA_SPINS = 7;
