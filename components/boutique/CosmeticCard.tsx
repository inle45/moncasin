"use client";

import type { CosmeticShopItem } from "@/utils/shop/catalog";
import { formatCoins } from "@/utils/format";
import { cn } from "@/utils/cn";

interface CosmeticCardProps {
  item: CosmeticShopItem;
  owned: boolean;
  canAfford: boolean;
  purchasing: boolean;
  onBuy: () => void;
}

export function CosmeticCard({
  item,
  owned,
  canAfford,
  purchasing,
  onBuy,
}: CosmeticCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-glass backdrop-blur-xl">
      <div
        className={cn(
          "relative h-24 bg-gradient-to-br",
          item.previewGradient
        )}
      >
        <span className="absolute inset-0 flex items-center justify-center text-4xl opacity-90">
          {item.emoji}
        </span>
        <span className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/80">
          {item.type === "theme" ? "Thème" : "Sons"}
        </span>
        {owned && (
          <span className="absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
            Possédé
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-base font-bold text-white">
          {item.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-white/50">
          {item.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="font-display text-lg font-bold tabular-nums text-casino-gold-neon">
            {formatCoins(item.price)}
          </p>
          <button
            type="button"
            disabled={owned || purchasing || (!canAfford && !owned)}
            onClick={onBuy}
            className={cn(
              "rounded-lg border border-casino-purple-neon/40 bg-casino-purple/25 px-4 py-2 text-xs font-bold uppercase text-white transition-all",
              "hover:bg-casino-purple-neon/30 active:scale-95",
              owned && "cursor-default border-white/10 bg-white/5 text-white/30",
              (!canAfford && !owned) && "cursor-not-allowed opacity-40"
            )}
          >
            {owned ? "✓" : purchasing ? "…" : "Acheter"}
          </button>
        </div>
      </div>
    </article>
  );
}
