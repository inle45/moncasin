import { cn } from "@/utils/cn";

/** Couleur du multiplicateur central (spec premium). */
export function multiplierDisplayClass(
  multiplier: number,
  isCrash: boolean
): string {
  if (isCrash) {
    return "text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.6)]";
  }
  if (multiplier >= 10) {
    return cn(
      "text-red-400",
      "drop-shadow-[0_0_28px_rgba(255,0,80,0.9)]",
      "animate-pulse"
    );
  }
  if (multiplier >= 2) {
    return "text-casino-gold-neon drop-shadow-[0_0_28px_rgba(255,215,0,0.65)]";
  }
  return "text-cyan-300 drop-shadow-[0_0_24px_rgba(34,211,238,0.85)]";
}
