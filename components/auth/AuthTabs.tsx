"use client";

import { cn } from "@/utils/cn";

export type AuthTab = "login" | "signup";

interface AuthTabsProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}

const tabs: { id: AuthTab; label: string }[] = [
  { id: "login", label: "Se connecter" },
  { id: "signup", label: "S'inscrire" },
];

export function AuthTabs({ active, onChange }: AuthTabsProps) {
  return (
    <div className="relative flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative z-10 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors duration-300",
            active === tab.id ? "text-white" : "text-white/40 hover:text-white/70"
          )}
        >
          {tab.label}
        </button>
      ))}
      <div
        className={cn(
          "absolute top-1 bottom-1 z-0 w-[calc(50%-4px)] rounded-lg",
          "bg-gradient-to-r from-casino-purple/80 to-casino-purple-neon/60",
          "shadow-neon-purple transition-transform duration-300 ease-out",
          active === "login" ? "left-1 translate-x-0" : "left-1 translate-x-full"
        )}
        aria-hidden
      />
    </div>
  );
}
