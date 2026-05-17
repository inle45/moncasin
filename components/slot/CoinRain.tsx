"use client";

import { useMemo } from "react";
import { cn } from "@/utils/cn";

interface CoinRainProps {
  active: boolean;
  intensity?: "normal" | "jackpot";
}

export function CoinRain({ active, intensity = "normal" }: CoinRainProps) {
  const coins = useMemo(
    () =>
      Array.from({ length: intensity === "jackpot" ? 48 : 28 }, (_, i) => ({
        id: i,
        left: `${(i * 17) % 100}%`,
        delay: `${(i % 12) * 0.08}s`,
        duration: `${1.2 + (i % 5) * 0.15}s`,
        size: i % 3 === 0 ? "text-lg" : "text-sm",
      })),
    [intensity]
  );

  if (!active) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      aria-hidden
    >
      {coins.map((coin) => (
        <span
          key={coin.id}
          className={cn(
            "absolute top-0 animate-coin-fall opacity-90",
            coin.size
          )}
          style={{
            left: coin.left,
            animationDelay: coin.delay,
            animationDuration: coin.duration,
          }}
        >
          🪙
        </span>
      ))}
    </div>
  );
}
