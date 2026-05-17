"use client";

import { cn } from "@/utils/cn";
import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AuthInput({ label, error, className, id, ...props }: AuthInputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-wider text-white/50"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5",
          "text-sm text-white placeholder:text-white/25",
          "shadow-glass backdrop-blur-xl outline-none transition-all duration-300",
          "focus:border-casino-purple-neon/50 focus:bg-white/[0.06] focus:shadow-neon-purple",
          error && "border-red-400/50 focus:border-red-400/60",
          className
        )}
        {...props}
      />
      {error && (
        <p className="animate-auth-message text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
