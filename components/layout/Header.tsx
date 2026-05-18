"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlayerAvatar } from "@/components/profile";
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    username,
    avatarUrl,
    vipStatus,
    profileFrame,
    loading,
    signOut,
  } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/[0.06] bg-casino-bg/70 backdrop-blur-2xl",
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3 sm:max-w-2xl">
        <Link href="/" className="group min-w-0 flex-1">
          <p className="truncate font-display text-lg font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-casino-gold-neon via-casino-gold to-casino-gold-dim bg-clip-text text-transparent">
              MonCasin.fr
            </span>
          </p>
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.2em] text-casino-purple-glow/80">
            by i4z
          </p>
        </Link>

        {loading ? (
          <div className="h-9 w-24 animate-pulse rounded-xl bg-white/5" />
        ) : isAuthenticated ? (
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/profil"
              className={cn(
                "flex max-w-[8.5rem] items-center gap-2 rounded-xl border border-casino-gold/30 sm:max-w-[10rem]",
                "bg-casino-gold/10 px-2 py-1.5 transition hover:border-casino-purple-neon/40 sm:px-2.5"
              )}
              title="Mon profil"
            >
              <PlayerAvatar
                username={username}
                avatarUrl={avatarUrl}
                vipStatus={vipStatus}
                profileFrame={profileFrame}
                size="sm"
              />
              <span className="truncate text-[10px] font-semibold text-casino-gold-neon sm:text-xs">
                {username ?? "Joueur"}
              </span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5",
                "text-xs font-semibold text-white/70 transition-all duration-300",
                "hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200",
                "active:scale-[0.97]"
              )}
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <Link
            href="/auth"
            className={cn(
              "shrink-0 rounded-xl border border-casino-purple-neon/40 bg-casino-purple/20 px-4 py-2.5",
              "text-sm font-semibold text-white shadow-neon-purple",
              "transition-all duration-300",
              "hover:border-casino-gold-neon/50 hover:bg-casino-purple-neon/30 hover:shadow-neon-gold",
              "active:scale-[0.97]"
            )}
          >
            Connexion
          </Link>
        )}
      </div>
    </header>
  );
}
