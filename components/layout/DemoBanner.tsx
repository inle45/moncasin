"use client";

import { DEMO_MODE } from "@/utils/supabase/client";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="mx-4 mb-2 rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-3 py-2 text-center text-[11px] text-casino-gold-neon">
      Mode démo — données locales · configure{" "}
      <code className="text-casino-gold">.env.local</code> pour Supabase
    </div>
  );
}
