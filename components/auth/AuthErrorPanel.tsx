"use client";

import type { AuthErrorDetails } from "@/utils/supabase/auth-errors";
import { cn } from "@/utils/cn";

interface AuthErrorPanelProps {
  details: AuthErrorDetails;
  className?: string;
}

export function AuthErrorPanel({ details, className }: AuthErrorPanelProps) {
  return (
    <div
      role="alert"
      className={cn(
        "animate-auth-message rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-left backdrop-blur-xl",
        className
      )}
    >
      <p className="text-sm font-semibold text-red-100">{details.message}</p>

      <ul className="mt-2 space-y-0.5 text-[11px] text-red-200/80">
        {details.code && (
          <li>
            <span className="text-red-300/60">code</span> {details.code}
          </li>
        )}
        {details.status != null && (
          <li>
            <span className="text-red-300/60">status</span> {details.status}
          </li>
        )}
        {details.name && (
          <li>
            <span className="text-red-300/60">name</span> {details.name}
          </li>
        )}
        {details.isTimeout && (
          <li className="text-amber-200/90">timeout client (pas de réponse à temps)</li>
        )}
        {details.isConfig && (
          <li className="text-amber-200/90">problème de configuration .env / Vercel</li>
        )}
      </ul>

      <details className="mt-3">
        <summary className="cursor-pointer text-[10px] font-medium uppercase tracking-wider text-red-300/70">
          Erreur brute Supabase (JSON)
        </summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-red-100/90">
          {details.raw}
        </pre>
      </details>
    </div>
  );
}
