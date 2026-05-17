import type { PaylineDef } from "./types";

/** Génère les 27 combinaisons possibles sur une grille 3×3 (≥ 20 lignes). */
export function buildPaylines(): PaylineDef[] {
  const lines: PaylineDef[] = [];
  let index = 0;

  for (let r0 = 0; r0 < 3; r0++) {
    for (let r1 = 0; r1 < 3; r1++) {
      for (let r2 = 0; r2 < 3; r2++) {
        lines.push({
          id: `L${index + 1}`,
          cells: [
            [r0, 0],
            [r1, 1],
            [r2, 2],
          ],
        });
        index++;
      }
    }
  }

  return lines;
}

export const PAYLINE_COUNT = 27;
