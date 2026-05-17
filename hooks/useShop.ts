"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import {
  canUpgradeToTier,
  getShopItem,
  type CosmeticShopItem,
  type ShopItem,
  type VipShopItem,
  type VipTier,
} from "@/utils/shop/catalog";
import {
  addOwnedItem,
  loadOwnedItems,
  ownsItem,
} from "@/utils/shop/inventory";
import { DEMO_MODE, safeGetUser } from "@/utils/supabase/client";
import {
  fetchProfile,
  updateProfileShopState,
} from "@/utils/supabase/profiles";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";

export type PurchaseResult =
  | { ok: true; message: string }
  | { ok: false; reason: "insufficient" | "owned" | "invalid" | "error"; message: string };

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

function saveDemoBalance(balance: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_BALANCE_KEY, String(balance));
}

export function useShop() {
  const demo = DEMO_MODE;

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [vipStatus, setVipStatus] = useState<VipTier>("Joueur");
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!demo);
  const [purchasing, setPurchasing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(demo);

  const refresh = useCallback(async () => {
    if (demo) {
      setBalance(loadDemoBalance());
      setVipStatus("Joueur");
      setOwnedIds(loadOwnedItems(null));
      setUserId(null);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { user } = await safeGetUser();

    if (!user) {
      setBalance(loadDemoBalance());
      setOwnedIds(loadOwnedItems(null));
      setUserId(null);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const { profile, error } = await fetchProfile(user.id);

    if (profile) {
      setBalance(Number(profile.balance));
      setVipStatus((profile.vip_status as VipTier) || "Joueur");
      setOwnedIds(loadOwnedItems(user.id));
      setIsDemoMode(false);
    } else {
      setBalance(INITIAL_BALANCE);
      setIsDemoMode(true);
      if (error) console.warn("[Shop]", error);
    }

    setLoading(false);
  }, [demo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (itemId: string): Promise<PurchaseResult> => {
      const item = getShopItem(itemId);
      if (!item) {
        return { ok: false, reason: "invalid", message: "Article introuvable." };
      }

      if (ownsItem(ownedIds, itemId)) {
        return { ok: false, reason: "owned", message: "Tu possèdes déjà cet article." };
      }

      if (item.category === "vip") {
        const vipItem = item as VipShopItem;
        if (!canUpgradeToTier(vipStatus, vipItem.vipTier)) {
          return {
            ok: false,
            reason: "owned",
            message: `Tu es déjà ${vipStatus} ou supérieur.`,
          };
        }
      }

      if (balance < item.price) {
        return {
          ok: false,
          reason: "insufficient",
          message: `Il te manque ${(item.price - balance).toLocaleString("fr-FR")} jetons.`,
        };
      }

      setPurchasing(true);
      const newBalance = balance - item.price;
      let newVip = vipStatus;
      let newOwned = [...ownedIds, itemId];

      if (item.category === "vip") {
        newVip = (item as VipShopItem).vipTier;
      }

      if (demo || !userId) {
        saveDemoBalance(newBalance);
        newOwned = addOwnedItem(null, itemId);
        setBalance(newBalance);
        setVipStatus(newVip);
        setOwnedIds(newOwned);
        setPurchasing(false);
        return {
          ok: true,
          message: `${item.name} débloqué ! Bienvenue dans l'élite.`,
        };
      }

      const { error } = await updateProfileShopState(userId, {
        balance: newBalance,
        vip_status: item.category === "vip" ? newVip : undefined,
      });

      if (error) {
        setPurchasing(false);
        return { ok: false, reason: "error", message: error };
      }

      newOwned = addOwnedItem(userId, itemId);
      setBalance(newBalance);
      setVipStatus(newVip);
      setOwnedIds(newOwned);
      setPurchasing(false);

      return {
        ok: true,
        message: `${item.name} est à toi ! Profite bien.`,
      };
    },
    [balance, demo, ownedIds, userId, vipStatus]
  );

  const isOwned = useCallback(
    (item: ShopItem) => {
      if (ownsItem(ownedIds, item.id)) return true;
      if (item.category === "vip") {
        return !canUpgradeToTier(vipStatus, item.vipTier);
      }
      return false;
    },
    [ownedIds, vipStatus]
  );

  return {
    balance,
    vipStatus,
    ownedIds,
    loading,
    purchasing,
    isDemoMode,
    purchase,
    isOwned,
    refresh,
  };
}
