"use client";

import { cn } from "@/utils/cn";

export type AuthMessageType = "success" | "error" | "info";

interface AuthMessageProps {
  type: AuthMessageType;
  message: string;
  className?: string;
}

const styles: Record<AuthMessageType, string> = {
  success:
    "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.15)]",
  error:
    "border-red-400/40 bg-red-500/15 text-red-200 shadow-[0_0_20px_rgba(248,113,113,0.15)]",
  info: "border-casino-purple-neon/40 bg-casino-purple/15 text-casino-purple-glow",
};

export function AuthMessage({ type, message, className }: AuthMessageProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "animate-auth-message rounded-xl border px-4 py-3 text-sm font-medium backdrop-blur-xl",
        styles[type],
        className
      )}
    >
      {message}
    </div>
  );
}
