"use client";

import { PlayerAvatar } from "@/components/profile";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import type { JackpotPotSegment } from "@/utils/jackpot/types";
import { cn } from "@/utils/cn";

interface JackpotPotBarProps {
  totalPot: number;
  segments: JackpotPotSegment[];
  className?: string;
}

export function JackpotPotBar({
  totalPot,
  segments,
  className,
}: JackpotPotBarProps) {
  const userIds = segments.map((s) => s.userId);
  const profiles = usePlayerAvatars(userIds);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-casino-purple-glow/90">
            Pot commun
          </p>
          <p className="font-display text-2xl font-bold tabular-nums text-casino-gold-neon">
            {totalPot.toLocaleString("fr-FR")}{" "}
            <span className="text-sm text-white/50">jetons</span>
          </p>
        </div>
        <p className="text-[10px] text-white/40">
          {segments.length} gladiateur{segments.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative h-14 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-neon-purple">
        {segments.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            {totalPot > 0
              ? "Chargement des gladiateurs…"
              : "En attente des guerriers…"}
          </div>
        ) : (
          <div className="flex h-full w-full">
            {segments.map((seg) => (
              <div
                key={seg.userId}
                className="relative flex h-full min-w-[2px] transition-all duration-500"
                style={{
                  width: `${Math.max(seg.percent, 4)}%`,
                  backgroundColor: seg.color,
                  boxShadow: `inset 0 0 20px ${seg.color}66`,
                }}
                title={`${seg.username} · ${seg.percent}%`}
              >
                <span className="absolute inset-0 animate-pulse bg-white/10" />
              </div>
            ))}
          </div>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {segments.map((seg) => {
          const profile = profiles[seg.userId];
          return (
            <li
              key={seg.userId}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-2 py-1"
            >
              <PlayerAvatar
                username={seg.username}
                avatarUrl={profile?.avatar_url}
                vipStatus={profile?.vip_status}
                profileFrame={profile?.profile_frame}
                size="xs"
              />
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold text-white/80">
                {seg.username}
              </span>
              <span
                className="text-[10px] font-bold tabular-nums"
                style={{ color: seg.color }}
              >
                {seg.percent}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
