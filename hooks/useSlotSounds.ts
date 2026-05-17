"use client";

import { useCallback, useRef } from "react";

export function useSlotSounds() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);

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
    (
      freq: number,
      duration: number,
      type: OscillatorType = "square",
      gain = 0.08
    ) => {
      if (!enabledRef.current) return;
      const ctx = getCtx();
      if (!ctx) return;

      if (ctx.state === "suspended") void ctx.resume();

      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
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

  const playSpinStart = useCallback(() => {
    tone(180, 0.08, "sawtooth", 0.05);
    setTimeout(() => tone(220, 0.06, "sawtooth", 0.04), 40);
  }, [tone]);

  const playReelStop = useCallback(
    (index: number) => {
      tone(320 + index * 90, 0.1, "triangle", 0.07);
    },
    [tone]
  );

  const playWin = useCallback(() => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => tone(f, 0.12, "sine", 0.09), i * 90);
    });
  }, [tone]);

  const playJackpot = useCallback(() => {
    [392, 494, 587, 740, 988].forEach((f, i) => {
      setTimeout(() => tone(f, 0.18, "square", 0.1), i * 110);
    });
  }, [tone]);

  const playFreeSpins = useCallback(() => {
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => tone(f, 0.14, "sine", 0.08), i * 100);
    });
  }, [tone]);

  const setEnabled = useCallback((value: boolean) => {
    enabledRef.current = value;
  }, []);

  return {
    playSpinStart,
    playReelStop,
    playWin,
    playJackpot,
    playFreeSpins,
    setEnabled,
  };
}
