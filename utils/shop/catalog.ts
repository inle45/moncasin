export type ShopCategory = "vip" | "cosmetics";

export type VipTier = "Joueur" | "VIP" | "VIP+";

export interface ShopItemBase {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  emoji: string;
}

export interface VipShopItem extends ShopItemBase {
  category: "vip";
  vipTier: VipTier;
  benefits: string[];
  accent: "purple" | "gold";
}

export interface CosmeticShopItem extends ShopItemBase {
  category: "cosmetics";
  type: "theme" | "sfx";
  previewGradient: string;
}

export type ShopItem = VipShopItem | CosmeticShopItem;

export const VIP_ITEMS: VipShopItem[] = [
  {
    id: "vip-grade",
    name: "Grade VIP",
    description: "Accès premium pour dominer le classement.",
    price: 5000,
    category: "vip",
    emoji: "👑",
    vipTier: "VIP",
    accent: "purple",
    benefits: [
      "Badge VIP exclusif sur le leaderboard",
      "Multiplicateur d'XP ×1,5",
      "Cadre de profil néon violet",
      "Accès anticipé aux nouveautés",
    ],
  },
  {
    id: "vip-plus-grade",
    name: "Grade VIP+",
    description: "L'élite absolue du casino i4z.",
    price: 20000,
    category: "vip",
    emoji: "💎",
    vipTier: "VIP+",
    accent: "gold",
    benefits: [
      "Badge VIP+ doré animé",
      "Multiplicateur d'XP ×2,5",
      "Thème interface Or Impérial inclus",
      "Priorité sur le Live Feed",
      "Bonus de bienvenue boutique -10%",
    ],
  },
];

export const COSMETIC_ITEMS: CosmeticShopItem[] = [
  {
    id: "theme-cyberpunk",
    name: "Thème Cyberpunk",
    description: "Interface néon cyan & magenta, vibes futuristes.",
    price: 2500,
    category: "cosmetics",
    type: "theme",
    emoji: "🌃",
    previewGradient: "from-cyan-500/40 via-fuchsia-600/30 to-violet-900/50",
  },
  {
    id: "theme-vegas",
    name: "Thème Vegas Classique",
    description: "Rouge profond, or clinquant, ambiance Strip.",
    price: 1800,
    category: "cosmetics",
    type: "theme",
    emoji: "🎰",
    previewGradient: "from-red-600/35 via-casino-gold/25 to-red-950/50",
  },
  {
    id: "sfx-retro",
    name: "Pack Sons Rétro",
    description: "Bips 8-bit, rouleaux mécaniques, jackpots vintage.",
    price: 1200,
    category: "cosmetics",
    type: "sfx",
    emoji: "📻",
    previewGradient: "from-amber-500/30 via-orange-600/20 to-amber-950/40",
  },
  {
    id: "sfx-memes",
    name: "Pack Sons Mèmes",
    description: "Sons drôles pour flex devant tes potes.",
    price: 1500,
    category: "cosmetics",
    type: "sfx",
    emoji: "😂",
    previewGradient: "from-lime-400/25 via-yellow-500/20 to-green-900/40",
  },
];

export const ALL_SHOP_ITEMS: ShopItem[] = [...VIP_ITEMS, ...COSMETIC_ITEMS];

export function getShopItem(id: string): ShopItem | undefined {
  return ALL_SHOP_ITEMS.find((item) => item.id === id);
}

const VIP_RANK: Record<VipTier, number> = {
  Joueur: 0,
  VIP: 1,
  "VIP+": 2,
};

export function canUpgradeToTier(
  current: VipTier,
  target: VipTier
): boolean {
  return VIP_RANK[target] > VIP_RANK[current];
}
