"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_BALANCE } from "@/utils/slot/constants";
import {
  computeSpinRotation,
  formatCountdown,
  getResultMessage,
  pickWeightedSegment,
} from "@/utils/wheel/engine";
import {
  canSpinNow,
  clearDemoLastSpin,
  clearUserLastSpin,
  getRemainingCooldownMs,
  loadDemoLastSpin,
  loadUserLastSpin,
  saveDemoLastSpin,
  saveUserLastSpin,
} from "@/utils/wheel/storage";
import { SPIN_ANIMATION_MS, type WheelSegment } from "@/utils/wheel/constants";
import { DEMO_MODE, safeGetUser } from "@/utils/supabase/client";
import {
  fetchLastWheelSpinFromDb,
  saveLastWheelSpinToDb,
} from "@/utils/supabase/wheel";
import { fetchProfile, updateProfileBalance } from "@/utils/supabase/profiles";

const DEMO_BALANCE_KEY = "moncasin_demo_shop_balance";

function loadDemoBalance(): number {
  if (typeof window === "undefined") return INITIAL_BALANCE;
  const raw = localStorage.getItem(DEMO_BALANCE_KEY);
  return raw ? Number(raw) : INITIAL_BALANCE;
}

function saveDemoBalance(balance: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_BALANCE_KEY, String(balance));
}

export type WheelToastKind = "win" | "jackpot" | "bankrupt";

export interface WheelToastState {
  kind: WheelToastKind;
  message: string;
  amount: number;
}

export function useDailyWheel() {
  const demo = DEMO_MODE;

  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [loading, setLoading] = useState(!demo);
  const [isDemoMode, setIsDemoMode] = useState(demo);
  const [userId, setUserId] = useState<string | null>(null);

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSpinAt, setLastSpinAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState("");
  const [toast, setToast] = useState<WheelToastState | null>(null);

  const balanceRef = useRef(INITIAL_BALANCE);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  const canSpin = canSpinNow(lastSpinAt) && !isSpinning && !loading;

  const loadLastSpin = useCallback(
    async (uid: string | null, demoMode: boolean) => {
      if (demoMode || !uid) {
        setLastSpinAt(loadDemoLastSpin());
        return;
      }

      const { lastSpinAt: dbSpin, error } = await fetchLastWheelSpinFromDb(uid);
      if (error) console.warn("[Wheel]", error);

      if (dbSpin) {
        setLastSpinAt(dbSpin);
        return;
      }

      setLastSpinAt(loadUserLastSpin(uid));
    },
    []
  );

  const refresh = useCallback(async () => {
    if (demo) {
      setBalance(loadDemoBalance());
      setUserId(null);
      setIsDemoMode(true);
      setLastSpinAt(loadDemoLastSpin());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { user } = await safeGetUser();

    if (!user) {
      setBalance(loadDemoBalance());
      setUserId(null);
      setIsDemoMode(true);
      setLastSpinAt(loadDemoLastSpin());
      setLoading(false);
      return;
    }

    setUserId(user.id);
    const { profile, error } = await fetchProfile(user.id);

    if (profile) {
      setBalance(Number(profile.balance));
      setIsDemoMode(false);
      await loadLastSpin(user.id, false);
    } else {
      setBalance(loadDemoBalance());
      setIsDemoMode(true);
      setLastSpinAt(loadDemoLastSpin());
      if (error) console.warn("[Wheel]", error);
    }

    setLoading(false);
  }, [demo, loadLastSpin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const tick = () => {
      const remaining = getRemainingCooldownMs(lastSpinAt);
      setCountdown(formatCountdown(remaining));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastSpinAt]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const persistLastSpin = useCallback(
    async (timestamp: number, uid: string | null, demoMode: boolean) => {
      if (demoMode || !uid) {
        saveDemoLastSpin(timestamp);
        return;
      }

      saveUserLastSpin(uid, timestamp);
      const { error } = await saveLastWheelSpinToDb(uid, timestamp);
      if (error) console.warn("[Wheel] save last spin:", error);
    },
    []
  );

  const persistBalance = useCallback(
    async (newBalance: number, uid: string | null, demoMode: boolean) => {
      if (demoMode || !uid) {
        saveDemoBalance(newBalance);
        return null;
      }
      const { error } = await updateProfileBalance(uid, newBalance);
      return error;
    },
    []
  );

  const showResultToast = useCallback((segment: WheelSegment) => {
    const kind: WheelToastKind =
      segment.kind === "jackpot"
        ? "jackpot"
        : segment.kind === "bankrupt"
          ? "bankrupt"
          : "win";

    setToast({
      kind,
      message: getResultMessage(segment),
      amount: segment.amount,
    });

    setTimeout(() => setToast(null), 4500);
  }, []);

  const spin = useCallback(() => {
    if (!canSpin || isSpinning) return;

    const { index, segment } = pickWeightedSegment();
    const nextRotation = computeSpinRotation(index, rotation);

    setIsSpinning(true);
    setToast(null);
    setRotation(nextRotation);

    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);

    spinTimeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      const prize = segment.amount;
      const newBalance = balanceRef.current + prize;

      setLastSpinAt(now);
      setBalance(newBalance);
      balanceRef.current = newBalance;

      await persistLastSpin(now, userId, isDemoMode);
      const balanceError = await persistBalance(newBalance, userId, isDemoMode);

      setIsSpinning(false);
      showResultToast(segment);

      if (balanceError) {
        console.warn("[Wheel] balance sync:", balanceError);
      }
    }, SPIN_ANIMATION_MS);
  }, [
    canSpin,
    isSpinning,
    rotation,
    userId,
    isDemoMode,
    persistLastSpin,
    persistBalance,
    showResultToast,
  ]);

  const resetCooldownDemo = useCallback(() => {
    if (!isDemoMode) return;
    clearDemoLastSpin();
    if (userId) clearUserLastSpin(userId);
    setLastSpinAt(null);
  }, [isDemoMode, userId]);

  return {
    balance,
    loading,
    isDemoMode,
    rotation,
    isSpinning,
    canSpin,
    countdown,
    toast,
    spin,
    resetCooldownDemo,
    refresh,
  };
}
