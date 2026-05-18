export const JACKPOT_CHANNEL = "jackpot:arena";
/** Décompte affiché (aligné avec la fonction SQL enter_jackpot_arena). */
export const JACKPOT_COUNTDOWN_SECONDS = 15;
export const JACKPOT_ROLLING_MS = 4000;
export const JACKPOT_ENDED_DISPLAY_MS = 5000;
export const JACKPOT_STATE_POLL_MS = 800;
/** Après « tirage imminent », resync si toujours bloqué en counting. */
export const JACKPOT_STUCK_ROLL_MS = 5000;
export const JACKPOT_LOOP_TICK_MS = 500;
export const JACKPOT_MIN_BET = 10;
export const JACKPOT_TAX_RATE = 0.02;

export const JACKPOT_SEGMENT_COLORS = [
  "#A855F7",
  "#FFD700",
  "#22D3EE",
  "#F472B6",
  "#34D399",
  "#FB923C",
  "#818CF8",
  "#F87171",
] as const;
