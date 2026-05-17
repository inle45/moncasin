"use client";

import type { VipShopItem } from "@/utils/shop/catalog";
import { formatCoins } from "@/utils/format";
import { cn } from "@/utils/cn";

interface VipGradeCardProps {
  item: VipShopItem;
  owned: boolean;
  canAfford: boolean;
  purchasing: boolean;
  onBuy: () => void;
}

export function VipGradeCard({
  item,
  owned,
  canAfford,
  purchasing,
  onBuy,
}: VipGradeCardProps) {
  const isGold = item.accent === "gold";

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 shadow-glass backdrop-blur-xl",
        isGold
          ? "border-casino-gold-neon/40 bg-gradient-to-br from-casino-gold/10 via-white/[0.03] to-transparent"
          : "border-casino-purple-neon/35 bg-gradient-to-br from-casino-purple/15 via-white/[0.03] to-transparent"
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-casino-gold-neon/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="text-3xl" aria-hidden>
            {item.emoji}
          </span>
          <h3
            className={cn(
              "mt-2 font-display text-lg font-bold",
              isGold ? "text-casino-gold-neon" : "text-casino-purple-glow"
            )}
          >
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-white/50">{item.description}</p>
        </div>
        {owned && (
          <span className="shrink-0 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
            Possédé
          </span>
        )}
      </div>

      <ul className="relative mt-4 space-y-2">
        {item.benefits.map((benefit) => (
          <li
            key={benefit}
            className="flex items-start gap-2 text-xs text-white/70"
          >
            <span className="text-casino-gold-neon" aria-hidden>
              ✦
            </span>
            {benefit}
          </li>
        ))}
      </ul>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <p className="font-display text-xl font-bold tabular-nums text-white">
          {formatCoins(item.price)}{" "}
          <span className="text-sm font-normal text-white/40">jetons</span>
        </p>
        <button
          type="button"
          disabled={owned || purchasing || (!canAfford && !owned)}
          onClick={onBuy}
          className={cn(
            "rounded-xl px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all",
            owned
              ? "cursor-default border border-white/10 bg-white/5 text-white/30"
              : isGold
                ? "border border-casino-gold-neon/50 bg-gradient-to-r from-casino-gold to-casino-gold-neon text-casino-bg shadow-neon-gold hover:brightness-110 active:scale-95"
                : "border border-casino-purple-neon/50 bg-gradient-to-r from-casino-purple to-casino-purple-neon text-white shadow-neon-purple hover:brightness-110 active:scale-95",
            (!canAfford && !owned) && "cursor-not-allowed opacity-40"
          )}
        >
          {owned ? "Débloqué" : purchasing ? "…" : "Acheter"}
        </button>
      </div>
    </article>
  );
}
