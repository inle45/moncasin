"use client";

import { FormEvent, useState } from "react";
import { AuthInput } from "./AuthInput";
import { signUpWithEmail, translateAuthError } from "@/utils/supabase/auth";
import { cn } from "@/utils/cn";

interface SignupFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function SignupForm({
  onSuccess,
  onError,
  onLoadingChange,
}: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = "L'email est requis.";
    if (!username.trim()) errors.username = "Le pseudo est requis.";
    else if (username.trim().length < 3)
      errors.username = "Minimum 3 caractères.";
    else if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
      errors.username = "Lettres, chiffres et _ uniquement.";
    if (!password) errors.password = "Le mot de passe est requis.";
    else if (password.length < 6)
      errors.password = "Minimum 6 caractères.";
    if (password !== confirmPassword)
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onLoadingChange(true);
    const { data, error } = await signUpWithEmail(
      email.trim(),
      password,
      username.trim()
    );
    onLoadingChange(false);

    if (error) {
      onError(translateAuthError(error.message));
      return;
    }

    if (data.session) {
      onSuccess("Compte créé avec succès ! Bienvenue sur MonCasin.fr 🎰");
    } else {
      onSuccess(
        "Compte créé ! Vérifie ta boîte mail pour confirmer ton inscription."
      );
    }
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
        label="Pseudo"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="TonPseudo"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={fieldErrors.username}
      />
      <AuthInput
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <AuthInput
        label="Confirmation du mot de passe"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={fieldErrors.confirmPassword}
      />

      <button
        type="submit"
        className={cn(
          "w-full rounded-xl py-3.5 font-display text-sm font-bold uppercase tracking-wider",
          "border border-casino-gold-neon/40 bg-gradient-to-r from-casino-gold/80 to-casino-gold-neon/90",
          "text-casino-bg shadow-neon-gold transition-all duration-300",
          "hover:brightness-110 active:scale-[0.98]"
        )}
      >
        Créer mon compte
      </button>
    </form>
  );
}
