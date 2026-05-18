"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatMultiplier } from "@/utils/crash/engine";
import { multiplierDisplayClass } from "@/utils/crash/multiplier-theme";
import type { CrashPhase } from "@/utils/crash/types";
import { cn } from "@/utils/cn";

interface CrashCanvasProps {
  multiplier: number;
  phase: CrashPhase;
  crashPoint: number | null;
  curvePoints: number[];
  history: number[];
  bettingSecondsLeft: number | null;
  roundNumber: number;
  crashFlash?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
}

const W = 400;
const H = 200;

function curveGeometry(points: number[]) {
  if (points.length < 1) {
    return {
      pathD: "M 8 192 L 8 192",
      rocket: { x: 8, y: 192 },
      fillD: "",
      coords: [] as { x: number; y: number }[],
    };
  }

  const w = 384;
  const h = 176;
  const maxM = Math.max(...points, 2);
  const coords = points.map((m, i) => {
    const x = 8 + (i / Math.max(points.length - 1, 1)) * w;
    const y = 192 - ((m - 1) / (maxM - 1 + 0.01)) * h;
    return { x, y: Math.max(16, Math.min(192, y)) };
  });

  const pathD = coords.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ""
  );
  const last = coords[coords.length - 1];
  const fillD = `${pathD} L ${last.x} 192 L 8 192 Z`;

  return { pathD, rocket: last, fillD, coords };
}

export function CrashCanvas({
  multiplier,
  phase,
  crashPoint,
  curvePoints,
  history,
  bettingSecondsLeft,
  roundNumber,
  crashFlash = false,
}: CrashCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shakeRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const trailRef = useRef<{ x: number; y: number; m: number }[]>([]);
  const rafRef = useRef<number>(0);
  const [shockwaves, setShockwaves] = useState<number[]>([]);

  const { pathD, rocket, fillD, coords } = useMemo(
    () => curveGeometry(curvePoints),
    [curvePoints]
  );

  const isFlying = phase === "flying";
  const isCrash = phase === "crashed";
  const isBetting = phase === "betting";

  const shakeIntensity =
    isFlying && multiplier > 5
      ? Math.min(10, 1.2 + (multiplier - 5) * 0.35)
      : 0;

  useEffect(() => {
    if (!crashFlash) return;
    setShockwaves([Date.now(), Date.now() + 120]);
    const t = window.setTimeout(() => setShockwaves([]), 900);
    return () => window.clearTimeout(t);
  }, [crashFlash]);

  useEffect(() => {
    if (isFlying && coords && coords.length > 0) {
      const last = coords[coords.length - 1];
      trailRef.current.push({ x: last.x, y: last.y, m: multiplier });
      if (trailRef.current.length > 48) trailRef.current.shift();
    }
    if (isBetting || isCrash) {
      trailRef.current = [];
    }
  }, [coords, isFlying, isBetting, isCrash, multiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    ctx.scale(dpr, dpr);

    const spawnParticles = (x: number, y: number) => {
      for (let i = 0; i < 3; i++) {
        particlesRef.current.push({
          x,
          y: y + 8,
          vx: (Math.random() - 0.5) * 2.2,
          vy: 1.5 + Math.random() * 2.5,
          life: 1,
          maxLife: 0.5 + Math.random() * 0.5,
          hue: 180 + Math.random() * 80,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const trail = trailRef.current;
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const t0 = trail[i - 1];
          const t1 = trail[i];
          const alpha = (i / trail.length) * 0.55;
          const grad = ctx.createLinearGradient(t0.x, t0.y, t1.x, t1.y);
          grad.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.15})`);
          grad.addColorStop(1, `rgba(168, 85, 247, ${alpha * 0.45})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 6 + (i / trail.length) * 4;
          ctx.shadowBlur = 14;
          ctx.shadowColor = "rgba(168, 85, 247, 0.6)";
          ctx.beginPath();
          ctx.moveTo(t0.x, t0.y);
          ctx.lineTo(t1.x, t1.y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      if (isFlying && rocket) {
        spawnParticles(rocket.x, rocket.y);
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.028;
        if (p.life <= 0) return false;
        const a = p.life / p.maxLife;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${a * 0.85})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 60%, ${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 + a * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        return true;
      });

      if (shakeRef.current && shakeIntensity > 0) {
        const sx = (Math.random() - 0.5) * shakeIntensity;
        const sy = (Math.random() - 0.5) * shakeIntensity;
        shakeRef.current.style.transform = `translate(${sx}px, ${sy}px)`;
      } else if (shakeRef.current) {
        shakeRef.current.style.transform = "translate(0, 0)";
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isFlying, rocket, shakeIntensity]);

  const displayMult =
    isCrash && crashPoint != null ? crashPoint : multiplier;

  return (
    <div
      className={cn(
        "relative mx-4 overflow-hidden rounded-2xl border-2",
        "bg-gradient-to-b from-violet-950/90 via-[#08040f] to-black",
        "shadow-[0_0_48px_rgba(124,58,237,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]",
        isBetting && "border-cyan-400/30",
        isFlying && "border-violet-400/50",
        isCrash && "border-red-500/50"
      )}
    >
      {crashFlash && (
        <div
          className="pointer-events-none absolute inset-0 z-30 animate-crash-flash bg-white"
          aria-hidden
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/60">
          Neon Crash · #{roundNumber}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {history.slice(0, 8).map((v, i) => (
            <span
              key={`${v}-${i}`}
              className={cn(
                "rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums",
                v < 2
                  ? "bg-red-500/20 text-red-300"
                  : v < 5
                    ? "bg-amber-500/20 text-amber-200"
                    : "bg-emerald-500/20 text-emerald-200"
              )}
            >
              {formatMultiplier(v)}
            </span>
          ))}
        </div>
      </div>

      <div ref={shakeRef} className="relative aspect-[2/1] w-full will-change-transform">
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          aria-hidden
        />

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="relative z-[5] h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="crash-neon-line" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22D3EE" />
              <stop offset="45%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#E879F9" />
            </linearGradient>
            <filter id="crash-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {fillD && (
            <path
              d={fillD}
              fill="url(#crash-neon-line)"
              opacity={0.12}
            />
          )}
          <path
            d={pathD}
            fill="none"
            stroke="url(#crash-neon-line)"
            strokeWidth={3.5}
            strokeLinecap="round"
            filter="url(#crash-glow)"
          />

          {isFlying && (
            <g transform={`translate(${rocket.x - 14}, ${rocket.y - 20})`}>
              <text fontSize="26" className="animate-float-subtle">
                🚀
              </text>
            </g>
          )}
        </svg>

        {shockwaves.map((id) => (
          <span
            key={id}
            className="pointer-events-none absolute z-20 animate-crash-shockwave rounded-full border-2 border-fuchsia-400/80"
            style={{
              left: `${((rocket?.x ?? 200) / W) * 100}%`,
              top: `${((rocket?.y ?? 100) / H) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            aria-hidden
          />
        ))}

        <div className="pointer-events-none absolute inset-0 z-[15] flex flex-col items-center justify-center">
          {isBetting ? (
            <>
              <p className="font-display text-6xl font-black tabular-nums text-cyan-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                {bettingSecondsLeft === null ? "—" : bettingSecondsLeft}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">
                {bettingSecondsLeft === null
                  ? "Synchronisation…"
                  : "secondes pour miser"}
              </p>
            </>
          ) : (
            <p
              className={cn(
                "font-display text-5xl font-black tabular-nums sm:text-6xl",
                multiplierDisplayClass(displayMult, isCrash)
              )}
            >
              {formatMultiplier(displayMult)}
              {isCrash && (
                <span className="mt-1 block text-center text-sm font-bold uppercase tracking-[0.3em] text-red-400">
                  Crash
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
