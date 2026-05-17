"use client";

import { useCallback, useRef } from "react";

export function useCrashSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (freq: number, duration: number, gain = 0.07) => {
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.frequency.value = freq;
      amp.gain.value = gain;
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    [getCtx]
  );

  const playLaunch = useCallback(() => {
    tone(120, 0.15, 0.06);
    setTimeout(() => tone(200, 0.2, 0.05), 80);
  }, [tone]);

  const playCashout = useCallback(() => {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => tone(f, 0.1, 0.08), i * 70);
    });
  }, [tone]);

  const playCrash = useCallback(() => {
    tone(80, 0.35, 0.12);
    setTimeout(() => tone(50, 0.4, 0.1), 100);
  }, [tone]);

  return { playLaunch, playCashout, playCrash };
}
