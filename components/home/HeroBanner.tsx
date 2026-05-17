export function HeroBanner() {
  return (
    <section className="relative mx-4 mb-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-glass backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-casino-purple-neon/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-casino-gold-neon/15 blur-3xl" />

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-casino-gold-neon/90">
          Bienvenue
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-white">
          Ton casino social
          <span className="block bg-gradient-to-r from-casino-purple-glow to-casino-gold-neon bg-clip-text text-transparent">
            entre potes
          </span>
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/50">
          Slots, classements et récompenses VIP — joue, grimpe et flex devant tes amis.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-lg border border-casino-purple-neon/30 bg-casino-purple/15 px-2.5 py-1 text-xs font-medium text-casino-purple-glow">
            +2 500 jetons offerts
          </span>
          <span className="rounded-lg border border-casino-gold/30 bg-casino-gold/10 px-2.5 py-1 text-xs font-medium text-casino-gold-neon">
            Roue du jour dispo
          </span>
        </div>
      </div>
    </section>
  );
}
