"use client";

import { useMemo } from "react";
import { formatMultiplier } from "@/utils/crash/engine";
import type { CrashPhase } from "@/utils/crash/types";
import { cn } from "@/utils/cn";

interface CrashCanvasProps {
  multiplier: number;
  phase: CrashPhase;
  crashPoint: number | null;
  curvePoints: number[];
  history: number[];
  bettingSecondsLeft: number;
  roundNumber: number;
}

export function CrashCanvas({
  multiplier,
  phase,
  crashPoint,
  curvePoints,
  history,
  bettingSecondsLeft,
  roundNumber,
}: CrashCanvasProps) {
  const pathD = useMemo(() => {
    if (curvePoints.length < 2) return "M 8 192 L 8 192";

    const w = 384;
    const h = 176;
    const maxM = Math.max(...curvePoints, 2);
    const pts = curvePoints.map((m, i) => {
      const x = 8 + (i / Math.max(curvePoints.length - 1, 1)) * w;
      const y = 192 - ((m - 1) / (maxM - 1 + 0.01)) * h;
      return [x, Math.max(16, Math.min(192, y))] as const;
    });

    return pts.reduce(
      (acc, [x, y], i) => (i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`),
      ""
    );
  }, [curvePoints]);

  const rocketPos = useMemo(() => {
    if (curvePoints.length < 1) return { x: 8, y: 192 };
    const w = 384;
    const h = 176;
    const maxM = Math.max(...curvePoints, 2);
    const i = curvePoints.length - 1;
    const m = curvePoints[i];
    const x = 8 + (i / Math.max(curvePoints.length - 1, 1)) * w;
    const y = 192 - ((m - 1) / (maxM - 1 + 0.01)) * h;
    return { x, y: Math.max(16, Math.min(192, y)) };
  }, [curvePoints]);

  const isFlying = phase === "flying";
  const isCrash = phase === "crashed";
  const isBetting = phase === "betting";

  return (
    <div
      className={cn(
        "relative mx-4 overflow-hidden rounded-2xl border-2",
        "bg-gradient-to-b from-violet-950/80 via-[#0a0612] to-black",
        "shadow-[0_0_40px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
        isBetting && "border-casino-gold/40",
        isFlying && "border-casino-purple-neon/50",
        isCrash && "border-red-500/60 animate-pulse"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Manche #{roundNumber}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {history.slice(0, 8).map((v, i) => (
            <span
              key={`${v}-${i}`}
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums",
                v < 2
                  ? "bg-red-500/20 text-red-300"
                  : v < 5
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-emerald-500/20 text-emerald-200"
              )}
            >
              {formatMultiplier(v)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative aspect-[2/1] w-full">
        <svg
          viewBox="0 0 400 200"
          className="h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="crash-line" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#FFD700" />
            </linearGradient>
            <linearGradient id="crash-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(168,85,247,0.35)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0)" />
            </linearGradient>
          </defs>

          <path
            d={`${pathD} L ${rocketPos.x} 192 L 8 192 Z`}
            fill="url(#crash-fill)"
          />
          <path
            d={pathD}
            fill="none"
            stroke="url(#crash-line)"
            strokeWidth="3"
            strokeLinecap="round"
            className={isFlying ? "drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]" : ""}
          />

          <g
            transform={`translate(${rocketPos.x - 14}, ${rocketPos.y - 20})`}
            className={cn(
              isFlying && "animate-float-subtle",
              isCrash && "opacity-0"
            )}
          >
            <text fontSize="28" aria-hidden>
              🚀
            </text>
          </g>

          {isCrash && (
            <text
              x="200"
              y="100"
              textAnchor="middle"
              fill="#f87171"
              fontSize="28"
              fontWeight="bold"
            >
              💥 CRASH
            </text>
          )}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {isBetting ? (
            <>
              <p className="font-display text-6xl font-black tabular-nums text-casino-gold-neon">
                {bettingSecondsLeft}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                secondes pour miser
              </p>
            </>
          ) : (
            <p
              className={cn(
                "font-display text-5xl font-black tabular-nums sm:text-6xl",
                isCrash && "text-red-400",
                isFlying &&
                  "text-casino-gold-neon drop-shadow-[0_0_24px_rgba(255,215,0,0.5)]"
              )}
            >
              {formatMultiplier(
                isCrash && crashPoint ? crashPoint : multiplier
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
