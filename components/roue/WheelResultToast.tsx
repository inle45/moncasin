"use client";

import { cn } from "@/utils/cn";
import { formatCoins } from "@/utils/format";
import type { WheelToastKind } from "@/hooks/useDailyWheel";

interface WheelResultToastProps {
  kind: WheelToastKind;
  message: string;
  amount: number;
  visible: boolean;
}

const STYLES: Record<
  WheelToastKind,
  { border: string; bg: string; text: string; icon: string }
> = {
  win: {
    border: "border-emerald-400/40",
    bg: "bg-emerald-500/20",
    text: "text-emerald-100",
    icon: "🎉",
  },
  jackpot: {
    border: "border-casino-gold/50",
    bg: "bg-gradient-to-r from-casino-gold/25 to-casino-purple/25",
    text: "text-casino-gold-neon",
    icon: "👑",
  },
  bankrupt: {
    border: "border-red-400/40",
    bg: "bg-red-500/15",
    text: "text-red-200",
    icon: "💀",
  },
};

export function WheelResultToast({
  kind,
  message,
  amount,
  visible,
}: WheelResultToastProps) {
  if (!visible) return null;

  const style = STYLES[kind];

  return (
    <div
      role="alert"
      className={cn(
        "fixed left-4 right-4 top-24 z-[90] mx-auto max-w-lg animate-auth-message",
        "rounded-2xl border px-4 py-4 shadow-glass backdrop-blur-xl sm:max-w-md",
        style.border,
        style.bg
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          {style.icon}
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className={cn("text-sm font-semibold leading-snug", style.text)}>
            {message}
          </p>
          {amount > 0 && (
            <p className="mt-1 font-display text-lg font-bold tabular-nums text-white">
              +{formatCoins(amount)} jetons
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
