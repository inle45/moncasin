"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { PlayerAvatar } from "@/components/profile";
import { VipBadge } from "@/components/leaderboard/VipBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { hasVipAvatarFrame } from "@/utils/profile/display";
import { cn } from "@/utils/cn";

export default function ProfilPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const editor = useProfileEditor(() => {
    void refreshProfile();
  });

  useEffect(() => {
    if (!editor.loading && !editor.isAuthenticated && !editor.isDemoMode) {
      router.replace("/auth");
    }
  }, [editor.loading, editor.isAuthenticated, editor.isDemoMode, router]);

  const previewVip = hasVipAvatarFrame(editor.vipStatus, editor.profileFrame);

  return (
    <div className="mx-auto min-h-screen max-w-lg pb-10 sm:max-w-2xl">
      <Header />
      <DemoBanner />

      <main className="px-4 pt-4">
        <Link
          href="/"
          className="inline-flex text-sm text-white/50 transition hover:text-white"
        >
          ← Accueil
        </Link>

        <h1 className="mt-4 font-display text-2xl font-bold text-white">
          Mon{" "}
          <span className="bg-gradient-to-r from-casino-gold-neon to-casino-purple-glow bg-clip-text text-transparent">
            profil
          </span>
        </h1>
        <p className="mt-1 text-sm text-white/45">
          Pseudo, avatar et cadre VIP visible partout sur MonCasin.
        </p>

        {editor.loading ? (
          <div className="mt-8 space-y-4">
            <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 animate-pulse rounded-xl bg-white/5" />
            <div className="h-12 animate-pulse rounded-xl bg-white/5" />
          </div>
        ) : editor.isDemoMode ? (
          <p className="mt-8 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Mode démo : connecte-toi pour synchroniser ton profil Supabase.
          </p>
        ) : !editor.isAuthenticated ? null : (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-6 shadow-neon-purple backdrop-blur-xl">
              <PlayerAvatar
                username={editor.username || "Joueur"}
                avatarUrl={editor.avatarUrl}
                vipStatus={editor.vipStatus}
                profileFrame={editor.profileFrame}
                size="xl"
              />
              <div className="text-center">
                <p className="font-display text-lg font-bold text-white">
                  {editor.username || "Joueur"}
                </p>
                <VipBadge status={editor.vipStatus} className="mt-2" />
                {previewVip && (
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-casino-purple-glow">
                    Cadre VIP actif
                  </p>
                )}
              </div>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void editor.save();
              }}
            >
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  Pseudo
                </span>
                <input
                  type="text"
                  value={editor.username}
                  onChange={(e) => editor.setUsername(e.target.value)}
                  autoComplete="username"
                  maxLength={24}
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3",
                    "text-white placeholder:text-white/25",
                    "focus:border-casino-purple-neon/50 focus:outline-none focus:ring-1 focus:ring-casino-purple-neon/40"
                  )}
                  placeholder="MonPseudo_42"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
                  URL photo de profil
                </span>
                <input
                  type="url"
                  value={editor.avatarUrl}
                  onChange={(e) => editor.setAvatarUrl(e.target.value)}
                  inputMode="url"
                  placeholder="https://…"
                  className={cn(
                    "w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3",
                    "font-mono text-sm text-cyan-100 placeholder:text-white/25",
                    "focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                  )}
                />
                <p className="text-[11px] text-white/35">
                  Colle un lien direct vers une image (jpg, png, webp).
                </p>
              </label>

              {editor.error && (
                <p
                  className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  role="alert"
                >
                  {editor.error}
                </p>
              )}
              {editor.success && (
                <p
                  className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                  role="status"
                >
                  {editor.success}
                </p>
              )}

              <button
                type="submit"
                disabled={editor.saving}
                className={cn(
                  "w-full rounded-xl py-3.5 font-display text-sm font-extrabold uppercase tracking-wide",
                  "border border-casino-gold-neon/50 bg-gradient-to-r from-casino-purple to-violet-600 text-white",
                  "shadow-neon-purple transition active:scale-[0.98]",
                  "hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {editor.saving ? "Enregistrement…" : "Enregistrer le profil"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
