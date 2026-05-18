"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlayerAvatar } from "@/components/profile";
import { usePlayerAvatars } from "@/hooks/usePlayerAvatars";
import { JACKPOT_ROLL_STRIP_MS } from "@/utils/jackpot/constants";
import type { JackpotBetRow } from "@/utils/jackpot/types";
import { cn } from "@/utils/cn";

interface JackpotRollStripProps {
  active: boolean;
  bets: JackpotBetRow[];
  winnerId: string | null;
  onRollComplete?: () => void;
}

const STRIP_REPEAT = 12;

export function JackpotRollStrip({
  active,
  bets,
  winnerId,
  onRollComplete,
}: JackpotRollStripProps) {
  const profiles = usePlayerAvatars(bets.map((b) => b.user_id));
  const [offset, setOffset] = useState(0);
  const [landed, setLanded] = useState(false);
  const rollCompleteFiredRef = useRef(false);

  const stripItems = useMemo(() => {
    if (!bets.length) return [];
    const base = bets.map((b) => ({
      userId: b.user_id,
      username: b.username,
      weight: b.bet_amount,
    }));
    const repeated: typeof base = [];
    for (let i = 0; i < STRIP_REPEAT; i++) {
      repeated.push(...base);
    }
    return repeated;
  }, [bets]);

  const winnerIndex = useMemo(() => {
    if (!winnerId || !bets.length) return 0;
    const idx = bets.findIndex((b) => b.user_id === winnerId);
    const cycleLen = bets.length;
    const midCycle = Math.floor(STRIP_REPEAT / 2) * cycleLen;
    return midCycle + (idx >= 0 ? idx : 0);
  }, [bets, winnerId]);

  useEffect(() => {
    if (!active || !stripItems.length) {
      setOffset(0);
      setLanded(false);
      rollCompleteFiredRef.current = false;
      return;
    }

    rollCompleteFiredRef.current = false;
    setLanded(false);
    const itemWidth = 72;
    const target = -(winnerIndex * itemWidth - 120);
    const start = performance.now();
    const duration = JACKPOT_ROLL_STRIP_MS;

    let frame = 0;
    const animate = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setOffset(target * eased);
      if (t < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setLanded(true);
        if (!rollCompleteFiredRef.current) {
          rollCompleteFiredRef.current = true;
          onRollComplete?.();
        }
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [active, stripItems.length, winnerIndex, onRollComplete]);

  if (!active || !stripItems.length) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-zinc-950/90 py-4 shadow-[0_0_32px_rgba(217,70,239,0.25)]">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-1 -translate-x-1/2 bg-casino-gold-neon shadow-neon-gold" />
      <div
        className="flex gap-3 px-4 transition-none"
        style={{ transform: `translateX(${offset}px)` }}
      >
        {stripItems.map((item, i) => {
          const profile = profiles[item.userId];
          const isWinner = landed && i === winnerIndex;
          return (
            <div
              key={`${item.userId}-${i}`}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl border p-1.5 transition-all duration-300",
                isWinner
                  ? "scale-110 border-casino-gold-neon bg-casino-gold/20 shadow-neon-gold"
                  : "border-white/10 bg-black/40"
              )}
            >
              <PlayerAvatar
                username={item.username}
                avatarUrl={profile?.avatar_url}
                vipStatus={profile?.vip_status}
                profileFrame={profile?.profile_frame}
                size="md"
              />
              <span className="max-w-full truncate text-[9px] font-semibold text-white/70">
                {item.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
