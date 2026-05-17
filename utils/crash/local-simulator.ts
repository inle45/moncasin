import { CRASH_BETTING_SECONDS } from "@/utils/crash/constants";
import { generateCrashPoint, multiplierAtElapsedMs } from "@/utils/crash/engine";
import type { CrashPhase } from "@/utils/crash/types";

const CRASH_DISPLAY_MS = 3000;
const TICK_MS = 50;

export interface LocalTickResult {
  phase: CrashPhase;
  bettingSecondsLeft: number;
  multiplier: number;
  crashPoint: number | null;
  roundNumber: number;
  justLaunched: boolean;
  justCrashed: boolean;
  justNewRound: boolean;
}

export class LocalCrashSimulator {
  private phase: CrashPhase = "betting";
  private bettingEndsAt = 0;
  private flyingStartedAt = 0;
  private crashedAt = 0;
  private targetCrash = 2;
  private roundNumber = 1;

  constructor() {
    this.startBettingRound(Date.now());
  }

  private startBettingRound(now: number) {
    this.phase = "betting";
    this.bettingEndsAt = now + CRASH_BETTING_SECONDS * 1000;
    this.targetCrash = generateCrashPoint();
  }

  tick(now = Date.now()): LocalTickResult {
    let justLaunched = false;
    let justCrashed = false;
    let justNewRound = false;

    if (this.phase === "betting" && now >= this.bettingEndsAt) {
      this.phase = "flying";
      this.flyingStartedAt = now;
      justLaunched = true;
    }

    if (this.phase === "flying") {
      const m = multiplierAtElapsedMs(now - this.flyingStartedAt);
      if (m >= this.targetCrash) {
        this.phase = "crashed";
        this.crashedAt = now;
        justCrashed = true;
      }
    }

    if (this.phase === "crashed" && now >= this.crashedAt + CRASH_DISPLAY_MS) {
      this.roundNumber += 1;
      this.startBettingRound(now);
      justNewRound = true;
    }

    const bettingSecondsLeft =
      this.phase === "betting"
        ? Math.max(0, Math.ceil((this.bettingEndsAt - now) / 1000))
        : 0;

    const multiplier =
      this.phase === "flying"
        ? multiplierAtElapsedMs(now - this.flyingStartedAt)
        : this.phase === "crashed"
          ? this.targetCrash
          : 1;

    return {
      phase: this.phase,
      bettingSecondsLeft,
      multiplier,
      crashPoint: this.phase === "crashed" ? this.targetCrash : null,
      roundNumber: this.roundNumber,
      justLaunched,
      justCrashed,
      justNewRound,
    };
  }
}

export { TICK_MS as LOCAL_CRASH_TICK_MS };
