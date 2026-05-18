"use client";

import Link from "next/link";
import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

export type GameSectionId =
  | "slot"
  | "crash"
  | "jackpot"
  | "leaderboard"
  | "vip-shop"
  | "daily-wheel";

interface GameSectionCardProps {
  id: GameSectionId;
  title: string;
  subtitle: string;
  href: string;
  icon: ReactNode;
  accent: "purple" | "gold";
  badge?: string;
  className?: string;
}

const accentStyles = {
  purple: {
    border: "border-casino-purple-neon/35",
    glow: "from-casino-purple-neon/25 via-transparent to-transparent",
    iconBg: "bg-casino-purple/30 text-casino-purple-glow",
    hover: "hover:border-casino-purple-glow/60 hover:shadow-neon-purple",
  },
  gold: {
    border: "border-casino-gold/35",
    glow: "from-casino-gold-neon/20 via-transparent to-transparent",
    iconBg: "bg-casino-gold/15 text-casino-gold-neon",
    hover: "hover:border-casino-gold-neon/55 hover:shadow-neon-gold",
  },
};

export function GameSectionCard({
  title,
  subtitle,
  href,
  icon,
  accent,
  badge,
  className,
}: GameSectionCardProps) {
  const styles = accentStyles[accent];

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[140px] flex-col overflow-hidden rounded-2xl border p-4",
        "bg-white/[0.04] shadow-glass backdrop-blur-xl",
        "transition-all duration-300 ease-out",
        "active:scale-[0.98]",
        styles.border,
        styles.hover,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
          styles.glow
        )}
      />
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/[0.03] blur-2xl transition-transform duration-500 group-hover:scale-125" />

      {badge && (
        <span className="absolute right-3 top-3 rounded-full border border-casino-gold/40 bg-casino-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-casino-gold-neon">
          {badge}
        </span>
      )}

      <div
        className={cn(
          "relative mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          styles.iconBg
        )}
      >
        {icon}
      </div>

      <div className="relative mt-auto">
        <h3 className="font-display text-base font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>
      </div>

      <span
        className="absolute bottom-3 right-3 text-lg text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-casino-gold-neon/80"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
