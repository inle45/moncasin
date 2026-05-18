"use client";

import type { JackpotRoundStatus } from "@/utils/jackpot/types";
import { cn } from "@/utils/cn";

const LABELS: Record<JackpotRoundStatus, string> = {
  waiting: "En attente des joueurs",
  counting: "Compte à rebours",
  rolling: "Tirage en cours…",
  ended: "Vainqueur couronné",
};

interface JackpotStatusBannerProps {
  status: JackpotRoundStatus;
  countdownSeconds: number | null;
  playerCount: number;
}

export function JackpotStatusBanner({
  status,
  countdownSeconds,
  playerCount,
}: JackpotStatusBannerProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-center backdrop-blur-xl",
        status === "counting" &&
          "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.2)]",
        status === "rolling" &&
          "border-fuchsia-400/50 bg-fuchsia-500/10 animate-pulse",
        status === "ended" &&
          "border-casino-gold-neon/50 bg-casino-gold/10 shadow-neon-gold",
        status === "waiting" && "border-white/10 bg-zinc-900/60"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/50">
        {LABELS[status]}
      </p>
      {status === "counting" && countdownSeconds != null && (
        <p className="mt-1 font-display text-4xl font-black tabular-nums text-cyan-300">
          {countdownSeconds}s
        </p>
      )}
      {status === "waiting" && (
        <p className="mt-1 text-xs text-white/45">
          {playerCount < 2
            ? "Il faut au moins 2 joueurs pour lancer le décompte"
            : "Prochain tirage imminent…"}
        </p>
      )}
    </div>
  );
}
