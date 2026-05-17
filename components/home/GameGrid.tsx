import { GameSectionCard } from "./GameSectionCard";
import {
  SlotIcon,
  LeaderboardIcon,
  VipShopIcon,
  WheelIcon,
} from "./GameIcons";

const SECTIONS = [
  {
    id: "slot" as const,
    title: "Machine à Sous",
    subtitle: "Jackpots néon & multiplicateurs",
    href: "/slot",
    accent: "purple" as const,
    icon: SlotIcon,
    badge: "Hot",
  },
  {
    id: "leaderboard" as const,
    title: "Leaderboard",
    subtitle: "Classement hebdo des potes",
    href: "/leaderboard",
    accent: "gold" as const,
    icon: LeaderboardIcon,
  },
  {
    id: "vip-shop" as const,
    title: "Boutique VIP",
    subtitle: "Skins, boosts & récompenses",
    href: "/boutique",
    accent: "gold" as const,
    icon: VipShopIcon,
    badge: "VIP",
  },
  {
    id: "daily-wheel" as const,
    title: "Roue Quotidienne",
    subtitle: "Tour gratuit chaque jour",
    href: "/roue",
    accent: "purple" as const,
    icon: WheelIcon,
    badge: "Gratuit",
  },
];

export function GameGrid() {
  return (
    <section aria-label="Jeux et fonctionnalités" className="px-4 pb-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-casino-purple-glow/90">
            Arcade
          </h2>
          <p className="text-xs text-white/40">Choisis ton mode de jeu</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          return (
            <GameSectionCard
              key={section.id}
              id={section.id}
              title={section.title}
              subtitle={section.subtitle}
              href={section.href}
              accent={section.accent}
              badge={section.badge}
              icon={<Icon className="h-6 w-6" />}
              className={index === 0 ? "col-span-2 min-h-[120px] sm:min-h-[140px]" : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
