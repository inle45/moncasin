"use client";

import { cn } from "@/utils/cn";

export type ToastType = "success" | "error";

interface PurchaseToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
}

export function PurchaseToast({ type, message, visible }: PurchaseToastProps) {
  if (!visible || !message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "fixed left-4 right-4 top-20 z-[90] mx-auto max-w-lg animate-auth-message rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow-glass backdrop-blur-xl sm:max-w-md",
        type === "success"
          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
          : "border-red-400/50 bg-red-500/20 text-red-100"
      )}
    >
      {type === "success" && (
        <span className="mr-2" aria-hidden>
          🎉
        </span>
      )}
      {message}
    </div>
  );
}
