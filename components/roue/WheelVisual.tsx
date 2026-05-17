"use client";

import { cn } from "@/utils/cn";
import {
  SEGMENT_ANGLE,
  SPIN_ANIMATION_MS,
  WHEEL_SEGMENTS,
} from "@/utils/wheel/constants";

interface WheelVisualProps {
  rotation: number;
  isSpinning: boolean;
}

const CONIC_STOPS = WHEEL_SEGMENTS.map((seg, i) => {
  const start = (i / WHEEL_SEGMENTS.length) * 100;
  const end = ((i + 1) / WHEEL_SEGMENTS.length) * 100;
  return `${seg.color} ${start}% ${end}%`;
}).join(", ");

export function WheelVisual({ rotation, isSpinning }: WheelVisualProps) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[min(92vw,340px)]">
      <div
        className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1"
        aria-hidden
      >
        <div
          className={cn(
            "h-0 w-0 border-x-[14px] border-t-[22px] border-x-transparent border-t-casino-gold-neon",
            "drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]",
            isSpinning && "animate-pulse"
          )}
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 rounded-full p-[5px]",
          "bg-gradient-to-br from-casino-gold via-casino-purple-neon to-casino-gold",
          "shadow-[0_0_40px_rgba(168,85,247,0.35),inset_0_0_20px_rgba(255,215,0,0.15)]"
        )}
      >
        <div className="relative h-full w-full overflow-hidden rounded-full bg-casino-bg/90 shadow-glass backdrop-blur-sm">
          <div
            className="absolute inset-[6%] origin-center will-change-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning
                ? `transform ${SPIN_ANIMATION_MS}ms cubic-bezier(0.15, 0.85, 0.2, 1)`
                : "none",
              background: `conic-gradient(from -90deg, ${CONIC_STOPS})`,
            }}
          >
            {WHEEL_SEGMENTS.map((seg, index) => {
              const labelAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
              return (
                <div
                  key={seg.id}
                  className="pointer-events-none absolute left-1/2 top-1/2 w-[42%] origin-left"
                  style={{
                    transform: `rotate(${labelAngle}deg) translateX(8%)`,
                  }}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center text-center leading-tight",
                      seg.kind === "jackpot" && "font-black"
                    )}
                    style={{ color: seg.textColor }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-wide opacity-90">
                      {seg.kind === "jackpot"
                        ? "★"
                        : seg.kind === "bankrupt"
                          ? "💀"
                          : "🪙"}
                    </span>
                    <span
                      className={cn(
                        "font-display text-[11px] font-bold sm:text-xs",
                        seg.kind === "jackpot" && "text-sm sm:text-base"
                      )}
                    >
                      {seg.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-casino-bg/80 shadow-[inset_0_0_24px_rgba(0,0,0,0.6)]" />
          </div>

          <div
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-black/30"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
