"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

const COLORS = [
  "bg-casino-gold-neon",
  "bg-casino-purple-glow",
  "bg-pink-400",
  "bg-cyan-400",
  "bg-emerald-400",
];

interface Particle {
  id: number;
  left: number;
  delay: number;
  color: string;
  size: number;
  rotate: number;
}

interface ConfettiBurstProps {
  active: boolean;
}

export function ConfettiBurst({ active }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    const next: Particle[] = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      color: COLORS[i % COLORS.length],
      size: 4 + Math.random() * 6,
      rotate: Math.random() * 360,
    }));

    setParticles(next);
    const t = setTimeout(() => setParticles([]), 2800);
    return () => clearTimeout(t);
  }, [active]);

  if (particles.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={cn(
            "absolute top-0 animate-confetti-fall rounded-sm opacity-90",
            p.color
          )}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
