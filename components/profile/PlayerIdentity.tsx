"use client";

import { PlayerAvatar, type PlayerAvatarSize } from "./PlayerAvatar";
import { cn } from "@/utils/cn";

interface PlayerIdentityProps {
  username: string;
  avatarUrl?: string | null;
  vipStatus?: string | null;
  profileFrame?: string | null;
  size?: PlayerAvatarSize;
  className?: string;
  nameClassName?: string;
}

export function PlayerIdentity({
  username,
  avatarUrl,
  vipStatus,
  profileFrame,
  size = "sm",
  className,
  nameClassName,
}: PlayerIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <PlayerAvatar
        username={username}
        avatarUrl={avatarUrl}
        vipStatus={vipStatus}
        profileFrame={profileFrame}
        size={size}
      />
      <span
        className={cn(
          "truncate font-medium text-white/85",
          nameClassName
        )}
      >
        {username}
      </span>
    </div>
  );
}

