"use client";

import { ConfettiBurst } from "@/components/boutique/ConfettiBurst";
import { PlayerAvatar } from "@/components/profile";
import { cn } from "@/utils/cn";

interface JackpotWinnerOverlayProps {
  active: boolean;
  username: string;
  payout: number;
  avatarUrl?: string | null;
  vipStatus?: string | null;
  profileFrame?: string | null;
}

export function JackpotWinnerOverlay({
  active,
  username,
  payout,
  avatarUrl,
  vipStatus,
  profileFrame,
}: JackpotWinnerOverlayProps) {
  if (!active) return null;

  return (
    <>
      <ConfettiBurst active={active} />
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-[90] flex items-center justify-center",
          "bg-black/60 backdrop-blur-sm animate-crash-flash"
        )}
        role="status"
      >
        <div className="mx-4 max-w-sm rounded-3xl border-2 border-casino-gold-neon/70 bg-zinc-950/95 p-6 text-center shadow-neon-gold">
          <PlayerAvatar
            username={username}
            avatarUrl={avatarUrl}
            vipStatus={vipStatus}
            profileFrame={profileFrame}
            size="xl"
            className="mx-auto"
          />
          <p className="mt-4 font-display text-2xl font-black leading-tight text-white sm:text-3xl">
            🏆 {username}
          </p>
          <p className="mt-2 text-lg font-bold text-casino-gold-neon">
            remporte {payout.toLocaleString("fr-FR")} jetons !
          </p>
          <p className="mt-2 text-[11px] text-white/40">
            Taxe casino 2% · Prochaine manche imminente
          </p>
        </div>
      </div>
    </>
  );
}
