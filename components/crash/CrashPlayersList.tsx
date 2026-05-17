"use client";

import { formatMultiplier } from "@/utils/crash/engine";
import type { CrashBetRow, CrashPhase } from "@/utils/crash/types";
import { cn } from "@/utils/cn";

interface CrashPlayersListProps {
  bets: CrashBetRow[];
  phase: CrashPhase;
  activeCount: number;
  connected: boolean;
}

export function CrashPlayersList({
  bets,
  phase,
  activeCount,
  connected,
}: CrashPlayersListProps) {
  const cashed = bets.filter((b) => b.status === "cashed_out").length;

  return (
    <div className="mx-4 rounded-xl border border-white/10 bg-zinc-900/60 p-3 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-casino-purple-glow/90">
          Joueurs en direct
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
            connected
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-amber-500/20 text-amber-200"
          )}
        >
          {connected ? "En ligne" : "Sync…"}
        </span>
      </div>

      <p className="mb-2 text-[11px] text-white/45">
        {activeCount} connecté{activeCount > 1 ? "s" : ""} · {bets.length} mise
        {bets.length > 1 ? "s" : ""}
        {phase === "flying" && ` · ${cashed} cashout`}
      </p>

      <ul className="max-h-28 space-y-1 overflow-y-auto">
        {bets.length === 0 && (
          <li className="text-center text-[11px] text-white/30">
            En attente des mises…
          </li>
        )}
        {bets.map((b) => (
          <li
            key={b.id}
            className={cn(
              "flex items-center justify-between rounded-lg px-2 py-1.5 text-xs",
              b.status === "cashed_out" && "bg-emerald-500/10",
              b.status === "lost" && "bg-red-500/10",
              b.status === "active" && "bg-white/5"
            )}
          >
            <span className="truncate font-medium text-white/85">
              {b.username}
            </span>
            <span className="shrink-0 tabular-nums">
              {b.status === "cashed_out" && b.cashout_multiplier ? (
                <span className="font-bold text-emerald-300">
                  {formatMultiplier(Number(b.cashout_multiplier))}
                </span>
              ) : b.status === "lost" ? (
                <span className="text-red-300">Perdu</span>
              ) : (
                <span className="text-casino-gold-neon">
                  {b.bet_amount.toLocaleString("fr-FR")} 🪙
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
