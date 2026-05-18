"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/crash", label: "Crash" },
  { href: "/jackpot", label: "Arène Jackpot" },
] as const;

export function AppNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex gap-1 rounded-xl border border-white/10 bg-zinc-950/80 p-1 backdrop-blur-xl",
        className
      )}
      aria-label="Navigation jeux"
    >
      {LINKS.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex-1 rounded-lg px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs",
              "transition-all duration-200",
              active
                ? "bg-gradient-to-r from-casino-purple to-violet-600 text-white shadow-neon-purple"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
