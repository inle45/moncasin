import { BET_OPTIONS } from "@/utils/slot/constants";

export const CRASH_BET_OPTIONS = BET_OPTIONS;
export const DEFAULT_CRASH_BET = 25;

/** Croissance exponentielle du multiplicateur (par seconde). */
export const CRASH_GROWTH_RATE = 0.12;

/** Marge maison (~4 %). */
export const CRASH_HOUSE_EDGE = 0.04;

export const CRASH_MAX_MULTIPLIER = 500;

export const CRASH_HISTORY_SIZE = 12;
