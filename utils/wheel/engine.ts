import {
  MAX_EXTRA_SPINS,
  MIN_EXTRA_SPINS,
  SEGMENT_ANGLE,
  WHEEL_SEGMENTS,
  type WheelSegment,
} from "./constants";

export function pickWeightedSegment(): { index: number; segment: WheelSegment } {
  const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
    roll -= WHEEL_SEGMENTS[i].weight;
    if (roll <= 0) {
      return { index: i, segment: WHEEL_SEGMENTS[i] };
    }
  }

  const last = WHEEL_SEGMENTS.length - 1;
  return { index: last, segment: WHEEL_SEGMENTS[last] };
}

/**
 * Calcule la rotation cumulative (deg) pour aligner le centre du segment
 * sous le pointeur fixe en haut de la roue.
 */
export function computeSpinRotation(
  targetIndex: number,
  currentRotation: number
): number {
  const segmentCenter = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
  const targetMod = (360 - segmentCenter + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;

  let delta = targetMod - currentMod;
  if (delta <= 0) delta += 360;

  const extraSpins =
    MIN_EXTRA_SPINS +
    Math.floor(Math.random() * (MAX_EXTRA_SPINS - MIN_EXTRA_SPINS + 1));

  return currentRotation + extraSpins * 360 + delta;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function getResultMessage(segment: WheelSegment): string {
  if (segment.kind === "bankrupt") {
    return "Banqueroute… Pas de gain cette fois. Retente demain !";
  }
  if (segment.kind === "jackpot") {
    return `JACKPOT ! +${segment.amount.toLocaleString("fr-FR")} jetons ajoutés à ton solde.`;
  }
  return `+${segment.amount.toLocaleString("fr-FR")} jetons ajoutés à ton solde !`;
}
