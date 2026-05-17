export type SlotSymbolId =
  | "cherry"
  | "clover"
  | "seven"
  | "crown"
  | "diamond"
  | "i4z"
  | "scatter";

export interface SlotSymbol {
  id: SlotSymbolId;
  emoji: string;
  label: string;
}

export type Grid = SlotSymbolId[][];

export interface PaylineDef {
  id: string;
  cells: [row: number, col: number][];
}

export interface LineWin {
  paylineId: string;
  symbol: SlotSymbolId;
  multiplier: number;
  payout: number;
  cells: [row: number, col: number][];
}

export interface JackpotWin {
  tier: "mini" | "minor" | "major" | "grand";
  multiplier: number;
  payout: number;
  /** Montant issu de la cagnotte progressive Supabase */
  poolPayout: number;
}

export interface SpinResult {
  grid: Grid;
  lineWins: LineWin[];
  jackpotWin: JackpotWin | null;
  scatterCount: number;
  triggersFreeSpins: boolean;
  comboMultiplier: number;
  totalPayout: number;
}

export type JackpotTier = "mini" | "minor" | "major" | "grand";

export type SpinPhase = "idle" | "spinning" | "revealing" | "celebrating";
