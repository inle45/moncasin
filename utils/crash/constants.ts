import { BET_OPTIONS } from "@/utils/slot/constants";

export const CRASH_BET_OPTIONS = BET_OPTIONS;
export const DEFAULT_CRASH_BET = 25;

/** Base du multiplicateur — identique à `crash_current_multiplier` Postgres. */
export const CRASH_MULTIPLIER_BASE = 1.06;

/** @deprecated Utiliser CRASH_MULTIPLIER_BASE */
export const CRASH_GROWTH_RATE = Math.log(CRASH_MULTIPLIER_BASE);

/** Marge maison (~4 %). */
export const CRASH_HOUSE_EDGE = 0.04;

export const CRASH_MAX_MULTIPLIER = 500;

export const CRASH_HISTORY_SIZE = 12;

/** Durée stricte de la phase de mises (secondes). */
export const CRASH_BETTING_SECONDS = 5;
