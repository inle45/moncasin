"use client";

import { cn } from "@/utils/cn";

export type ShopTab = "vip" | "cosmetics";

interface ShopTabsProps {
  active: ShopTab;
  onChange: (tab: ShopTab) => void;
}

const tabs: { id: ShopTab; label: string }[] = [
  { id: "vip", label: "Grades VIP" },
  { id: "cosmetics", label: "Cosmétiques & SFX" },
];

export function ShopTabs({ active, onChange }: ShopTabsProps) {
  return (
    <div className="relative flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative z-10 flex-1 rounded-lg px-1 py-2.5 text-xs font-semibold transition-colors duration-300 sm:text-sm",
            active === tab.id ? "text-white" : "text-white/40 hover:text-white/70"
          )}
        >
          {tab.label}
        </button>
      ))}
      <div
        className={cn(
          "absolute top-1 bottom-1 z-0 w-[calc(50%-4px)] rounded-lg",
          "bg-gradient-to-r from-casino-purple/80 to-casino-gold/60",
          "shadow-neon-gold transition-transform duration-300 ease-out",
          active === "vip" ? "left-1 translate-x-0" : "left-1 translate-x-full"
        )}
        aria-hidden
      />
    </div>
  );
}
