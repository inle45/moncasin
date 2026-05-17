"use client";

import { DemoBanner } from "@/components/layout/DemoBanner";
import { Header } from "@/components/layout/Header";
import { LiveFeed } from "@/components/layout/LiveFeed";
import { HeroBanner } from "@/components/home/HeroBanner";
import { GameGrid } from "@/components/home/GameGrid";

export default function HomePage() {
  return (
    <div className="mx-auto min-h-screen max-w-lg sm:max-w-2xl">
      <LiveFeed />
      <Header />
      <DemoBanner />

      <main className="pt-2">
        <HeroBanner />
        <GameGrid />
      </main>

      <footer className="px-4 pb-6 pt-2 text-center">
        <p className="text-[10px] text-white/25">
          MonCasin.fr by i4z — Jeu social fictif · 18+
        </p>
      </footer>
    </div>
  );
}
