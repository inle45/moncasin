import Link from "next/link";
import { cn } from "@/utils/cn";

interface LeaderboardHeaderProps {
  className?: string;
}

export function LeaderboardHeader({ className }: LeaderboardHeaderProps) {
  return (
    <header className={cn("px-4 pt-3", className)}>
      <Link
        href="/"
        className={cn(
          "mb-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2",
          "text-sm font-medium text-white/80 backdrop-blur-xl transition-all",
          "hover:border-casino-purple-neon/40 hover:text-white active:scale-95"
        )}
      >
        <span aria-hidden>←</span>
        Accueil
      </Link>

      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-casino-purple-glow/80">
          Classement live
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">
          <span className="bg-gradient-to-r from-casino-gold-neon via-white to-casino-gold bg-clip-text text-transparent">
            LE TOP i4z
          </span>
          <span className="block text-lg text-casino-purple-glow sm:text-xl">
            CASINO
          </span>
        </h1>
        <p className="mt-2 text-xs text-white/40">
          Les 100 plus gros soldes de la communauté
        </p>
      </div>
    </header>
  );
}
