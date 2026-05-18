"use client";

import { hasVipAvatarFrame, profileInitials } from "@/utils/profile/display";
import { cn } from "@/utils/cn";

export type PlayerAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<
  PlayerAvatarSize,
  { box: string; text: string; img: number; ring: string }
> = {
  xs: { box: "h-6 w-6", text: "text-[8px]", img: 24, ring: "p-[2px]" },
  sm: { box: "h-8 w-8", text: "text-[10px]", img: 32, ring: "p-[2px]" },
  md: { box: "h-10 w-10", text: "text-xs", img: 40, ring: "p-[2px]" },
  lg: { box: "h-16 w-16", text: "text-sm", img: 64, ring: "p-[3px]" },
  xl: { box: "h-24 w-24", text: "text-lg", img: 96, ring: "p-[3px]" },
};

export interface PlayerAvatarProps {
  username?: string | null;
  avatarUrl?: string | null;
  vipStatus?: string | null;
  profileFrame?: string | null;
  size?: PlayerAvatarSize;
  className?: string;
  showVipRing?: boolean;
}

export function PlayerAvatar({
  username,
  avatarUrl,
  vipStatus,
  profileFrame,
  size = "md",
  className,
  showVipRing = true,
}: PlayerAvatarProps) {
  const s = SIZE[size];
  const vipFrame =
    showVipRing && hasVipAvatarFrame(vipStatus, profileFrame);
  const src = avatarUrl?.trim() || null;
  const initials = profileInitials(username);

  return (
    <div
      className={cn(
        "relative shrink-0 rounded-full",
        s.box,
        vipFrame && "avatar-vip-ring",
        className
      )}
    >
      <div
        className={cn(
          "h-full w-full rounded-full",
          vipFrame
            ? cn(
                "bg-gradient-to-br from-casino-purple-neon via-fuchsia-500 to-violet-600",
                s.ring
              )
            : "border border-white/15"
        )}
      >
        <div
          className={cn(
            "relative h-full w-full overflow-hidden rounded-full bg-zinc-900",
            vipFrame ? "m-px" : ""
          )}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              width={s.img}
              height={s.img}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              className={cn(
                "flex h-full w-full items-center justify-center font-bold text-casino-purple-glow",
                "bg-gradient-to-br from-casino-purple/40 to-zinc-900",
                s.text
              )}
            >
              {initials}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
