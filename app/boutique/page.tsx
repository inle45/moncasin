"use client";

import { useCallback, useState } from "react";
import {
  BoutiqueHeader,
  ConfettiBurst,
  CosmeticCard,
  PurchaseToast,
  ShopSkeleton,
  ShopTabs,
  type ShopTab,
  VipGradeCard,
} from "@/components/boutique";
import { useShop } from "@/hooks/useShop";
import { COSMETIC_ITEMS, VIP_ITEMS } from "@/utils/shop/catalog";
import { cn } from "@/utils/cn";

export default function BoutiquePage() {
  const [tab, setTab] = useState<ShopTab>("vip");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);

  const {
    balance,
    vipStatus,
    loading,
    purchasing,
    isDemoMode,
    purchase,
    isOwned,
  } = useShop();

  const showToast = useCallback(
    (type: "success" | "error", message: string, confetti = false) => {
      setToast({ type, message });
      if (confetti) setShowConfetti(true);
      setTimeout(() => setToast(null), 3500);
    },
    []
  );

  const handleBuy = useCallback(
    async (itemId: string) => {
      setActivePurchaseId(itemId);
      const result = await purchase(itemId);
      setActivePurchaseId(null);

      if (result.ok) {
        showToast("success", result.message, true);
      } else {
        showToast("error", result.message);
      }
    },
    [purchase, showToast]
  );

  return (
    <div className="relative mx-auto min-h-screen max-w-lg bg-casino-bg pb-10 sm:max-w-2xl">
      <ConfettiBurst active={showConfetti} />
      <PurchaseToast
        type={toast?.type ?? "success"}
        message={toast?.message ?? ""}
        visible={!!toast}
      />

      <BoutiqueHeader
        balance={balance}
        vipStatus={vipStatus}
        isLoading={loading}
      />

      {isDemoMode && !loading && (
        <p className="mx-4 mt-2 rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-[11px] text-casino-gold-neon">
          Mode démo · achats sauvegardés localement sur cet appareil
        </p>
      )}

      <div className="mt-4 px-4">
        <ShopTabs active={tab} onChange={setTab} />
      </div>

      {loading ? (
        <ShopSkeleton />
      ) : (
        <div className="mt-4 px-4">
          {tab === "vip" ? (
            <div className="space-y-4">
              {VIP_ITEMS.map((item) => (
                <VipGradeCard
                  key={item.id}
                  item={item}
                  owned={isOwned(item)}
                  canAfford={balance >= item.price}
                  purchasing={purchasing && activePurchaseId === item.id}
                  onBuy={() => handleBuy(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {COSMETIC_ITEMS.map((item) => (
                <CosmeticCard
                  key={item.id}
                  item={item}
                  owned={isOwned(item)}
                  canAfford={balance >= item.price}
                  purchasing={purchasing && activePurchaseId === item.id}
                  onBuy={() => handleBuy(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "pointer-events-none fixed -left-20 top-1/3 h-48 w-48 rounded-full bg-casino-purple/20 blur-[100px]"
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none fixed -right-16 bottom-1/4 h-40 w-40 rounded-full bg-casino-gold/15 blur-[80px]"
        )}
        aria-hidden
      />
    </div>
  );
}
