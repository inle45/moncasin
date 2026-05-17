import {
  FREE_SPIN_MULTIPLIER,
  JACKPOT_TIERS,
  LINE_PAYOUTS,
  PAYLINES,
  SCATTER_TRIGGER_COUNT,
  SYMBOL_WEIGHTS,
} from "./constants";
import type {
  Grid,
  JackpotTier,
  JackpotWin,
  LineWin,
  PaylineDef,
  SlotSymbolId,
  SpinResult,
} from "./types";

const WEIGHT_POOL: SlotSymbolId[] = Object.entries(SYMBOL_WEIGHTS).flatMap(
  ([id, weight]) => Array(weight).fill(id as SlotSymbolId)
);

export function randomSymbol(): SlotSymbolId {
  return WEIGHT_POOL[Math.floor(Math.random() * WEIGHT_POOL.length)];
}

export function createEmptyGrid(): Grid {
  return [
    ["cherry", "cherry", "cherry"],
    ["clover", "clover", "clover"],
    ["seven", "seven", "seven"],
  ];
}

export function generateGrid(): Grid {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => randomSymbol())
  );
}

function resolveLineSymbol(ids: SlotSymbolId[]): SlotSymbolId | null {
  const nonScatter = ids.filter((id) => id !== "scatter");
  if (nonScatter.length === 0) return null;

  const wilds = nonScatter.filter((id) => id === "i4z");
  const base = nonScatter.filter((id) => id !== "i4z");

  if (base.length === 0) return "i4z";

  const first = base[0];
  const allMatch = base.every((id) => id === first);
  if (allMatch && base.length + wilds.length === 3) return first;

  if (base.length === 1 && wilds.length >= 2) return base[0];
  if (base.length === 2 && base[0] === base[1] && wilds.length >= 1) return base[0];

  return null;
}

function evaluatePayline(
  grid: Grid,
  payline: PaylineDef,
  bet: number
): LineWin | null {
  const ids = payline.cells.map(([row, col]) => grid[row][col]);
  if (ids.includes("scatter")) return null;

  const symbol = resolveLineSymbol(ids);
  if (!symbol || symbol === "scatter") return null;

  const multiplier = LINE_PAYOUTS[symbol];
  if (multiplier <= 0) return null;

  return {
    paylineId: payline.id,
    symbol,
    multiplier,
    payout: bet * multiplier,
    cells: payline.cells,
  };
}

function countScatters(grid: Grid): number {
  return grid.flat().filter((id) => id === "scatter").length;
}

function evaluateJackpot(grid: Grid, bet: number): JackpotWin | null {
  for (const tier of [...JACKPOT_TIERS].reverse()) {
    const midRow = [grid[1][0], grid[1][1], grid[1][2]];
    const resolved = resolveLineSymbol(midRow);
    if (resolved === tier.symbol) {
      return {
        tier: tier.tier,
        multiplier: tier.multiplier,
        payout: bet * tier.multiplier,
      };
    }
  }
  return null;
}

function comboMultiplier(lineCount: number): number {
  if (lineCount >= 4) return 2.5;
  if (lineCount === 3) return 2;
  if (lineCount === 2) return 1.5;
  return 1;
}

export function evaluateSpin(
  grid: Grid,
  bet: number,
  freeSpinMode: boolean
): SpinResult {
  const lineWins = PAYLINES.map((pl) => evaluatePayline(grid, pl, bet)).filter(
    (w): w is LineWin => w !== null
  );

  const jackpotWin = evaluateJackpot(grid, bet);
  const scatterCount = countScatters(grid);
  const triggersFreeSpins = scatterCount >= SCATTER_TRIGGER_COUNT;

  const baseLinePayout = lineWins.reduce((sum, w) => sum + w.payout, 0);
  const combo = comboMultiplier(lineWins.length);
  const freeMult = freeSpinMode ? FREE_SPIN_MULTIPLIER : 1;
  const lineTotal = Math.floor(baseLinePayout * combo * freeMult);
  const jackpotTotal = jackpotWin?.payout ?? 0;
  const totalPayout = lineTotal + jackpotTotal;

  return {
    grid,
    lineWins,
    jackpotWin,
    scatterCount,
    triggersFreeSpins,
    comboMultiplier: combo,
    totalPayout,
  };
}

export function getWinningCells(result: SpinResult): Set<string> {
  const keys = new Set<string>();
  for (const win of result.lineWins) {
    for (const [row, col] of win.cells) {
      keys.add(`${row}-${col}`);
    }
  }
  if (result.jackpotWin) {
    keys.add("1-0");
    keys.add("1-1");
    keys.add("1-2");
  }
  if (result.triggersFreeSpins) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (result.grid[r][c] === "scatter") keys.add(`${r}-${c}`);
      }
    }
  }
  return keys;
}

export function jackpotAmount(bet: number, multiplier: number): number {
  return bet * multiplier;
}

export type { JackpotTier };
