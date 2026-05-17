"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

/** Toujours visible — affiche la réponse brute de GET /api/auth/diagnostics */
export function AuthDiagnostics({ className }: { className?: string }) {
  const [jsonText, setJsonText] = useState<string>(
    "Chargement de /api/auth/diagnostics…"
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/diagnostics", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let body: unknown = text;
        try {
          body = JSON.parse(text);
        } catch {
          /* texte brut */
        }

        const output = JSON.stringify(
          { httpStatus: res.status, ok: res.ok, body },
          null,
          2
        );

        if (!cancelled) setJsonText(output);
      } catch (err) {
        if (!cancelled) {
          setJsonText(
            JSON.stringify(
              {
                fetchError: err instanceof Error ? err.message : String(err),
              },
              null,
              2
            )
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className={cn(
        "relative z-50 mb-6 rounded-xl border-2 border-amber-400/70 bg-black/80 p-4 shadow-lg",
        className
      )}
      aria-live="polite"
    >
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
        Diagnostic Supabase (serveur) — /api/auth/diagnostics
      </h2>
      <p className="mb-2 text-[10px] text-white/50">
        Réponse API affichée en direct (sans condition).
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-200">
        {jsonText}
      </pre>
    </section>
  );
}
