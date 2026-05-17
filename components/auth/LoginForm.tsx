"use client";

import { FormEvent, useState } from "react";
import { AuthInput } from "./AuthInput";
import { signInWithEmail } from "@/utils/supabase/auth";
import type { AuthErrorDetails } from "@/utils/supabase/auth-errors";
import { cn } from "@/utils/cn";

interface LoginFormProps {
  onSuccess: () => void;
  onError: (details: AuthErrorDetails) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function LoginForm({ onSuccess, onError, onLoadingChange }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "L'email est requis.";
    if (!password) errors.password = "Le mot de passe est requis.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onLoadingChange(true);
    const { error, details } = await signInWithEmail(email.trim(), password);
    onLoadingChange(false);

    if (error && details) {
      onError(details);
      return;
    }

    if (error) {
      onError({
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
        isTimeout: false,
        isConfig: false,
        raw: JSON.stringify(error, null, 2),
      });
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="toi@exemple.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <AuthInput
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />

      <button
        type="submit"
        className={cn(
          "w-full rounded-xl py-3.5 font-display text-sm font-bold uppercase tracking-wider",
          "border border-casino-gold-neon/40 bg-gradient-to-r from-casino-purple to-casino-purple-neon",
          "text-white shadow-neon-purple transition-all duration-300",
          "hover:shadow-neon-gold active:scale-[0.98]"
        )}
      >
        Se connecter
      </button>
    </form>
  );
}
