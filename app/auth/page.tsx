"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthTabs, type AuthTab } from "@/components/auth/AuthTabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import {
  AuthMessage,
  type AuthMessageType,
} from "@/components/auth/AuthMessage";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_MODE } from "@/utils/supabase/client";
import { cn } from "@/utils/cn";

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: AuthMessageType;
    text: string;
  } | null>(null);

  const supabaseReady = !DEMO_MODE;

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSuccess = (successMessage?: string) => {
    setMessage({
      type: "success",
      text: successMessage ?? "Connexion réussie ! Redirection…",
    });
    setTimeout(() => router.replace("/"), 800);
  };

  const handleError = (text: string) => {
    setMessage({ type: "error", text });
  };

  const handleTabChange = (next: AuthTab) => {
    setTab(next);
    setMessage(null);
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-lg overflow-hidden bg-casino-bg px-4 py-8 sm:max-w-md">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-casino-purple/25 blur-[100px]" />
      <div className="pointer-events-none absolute -right-16 bottom-32 h-48 w-48 rounded-full bg-casino-gold/15 blur-[80px]" />

      <Link
        href="/"
        className="relative z-10 mb-8 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
      >
        <span aria-hidden>←</span> Retour à l&apos;accueil
      </Link>

      <div className="relative z-10 mb-8 text-center">
        <p className="font-display text-2xl font-bold">
          <span className="bg-gradient-to-r from-casino-gold-neon via-casino-gold to-casino-gold-dim bg-clip-text text-transparent">
            MonCasin.fr
          </span>
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.25em] text-casino-purple-glow/80">
          by i4z
        </p>
        <p className="mt-3 text-sm text-white/45">
          {tab === "login"
            ? "Content de te revoir — entre dans l'arène."
            : "Rejoins la table et récupère tes 1000 jetons."}
        </p>
      </div>

      {!supabaseReady && (
        <AuthMessage
          type="info"
          message="Supabase non configuré : ajoute tes clés dans .env.local puis redémarre npm run dev."
          className="relative z-10 mb-4"
        />
      )}

      <div
        className={cn(
          "relative z-10 rounded-2xl border border-white/[0.08] p-5 shadow-glass backdrop-blur-2xl",
          "bg-white/[0.04]"
        )}
      >
        <AuthTabs active={tab} onChange={handleTabChange} />

        <div className="mt-6 min-h-[3rem]">
          {message && (
            <AuthMessage type={message.type} message={message.text} />
          )}
          {authLoading && supabaseReady && !message && (
            <p className="animate-pulse text-center text-xs text-white/40">
              Vérification de la session…
            </p>
          )}
        </div>

        <div className="mt-4">
          {tab === "login" ? (
            <LoginForm
              onSuccess={() => handleSuccess()}
              onError={handleError}
              onLoadingChange={setSubmitting}
            />
          ) : (
            <SignupForm
              onSuccess={handleSuccess}
              onError={handleError}
              onLoadingChange={setSubmitting}
            />
          )}
        </div>

        {submitting && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
            <span className="h-4 w-4 animate-spin rounded-full border border-casino-gold-neon border-t-transparent" />
            Traitement en cours…
          </div>
        )}
      </div>

      <p className="relative z-10 mt-6 text-center text-[10px] text-white/25">
        Jeu social fictif · 18+ · Jouez responsablement
      </p>
    </div>
  );
}
