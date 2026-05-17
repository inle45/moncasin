"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[MonCasin]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-casino-bg px-6 text-center">
      <p className="font-display text-xl font-bold text-white">
        Oups, une erreur est survenue
      </p>
      <p className="max-w-sm text-sm text-white/50">{error.message}</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-casino-purple-neon/40 bg-casino-purple/20 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Réessayer
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
