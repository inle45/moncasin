"use client";

import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

interface DiagnosticsPayload {
  configured: boolean;
  browserConfigError: string | null;
  url: string | null;
  anonKeyPresent: boolean;
  anonKeyMasked: string | null;
  anonKeyFormat: string;
  anonLooksLikeServiceRole: boolean;
  publicEnvOk: boolean;
  serviceKeyPresent: boolean;
  serviceEnvOk: boolean;
  authHealth: { ok: boolean; status: number; body?: string } | null;
}

export function AuthDiagnostics({ className }: { className?: string }) {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/diagnostics", { cache: "no-store" });
        const json = (await res.json()) as DiagnosticsPayload & { error?: string };
        if (!cancelled) {
          if (!res.ok) {
            setLoadError(json.error ?? `HTTP ${res.status}`);
          } else {
            setData(json);
            setLoadError(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <p className={cn("text-[10px] text-amber-200/80", className)}>
        Diagnostic serveur : {loadError}
      </p>
    );
  }

  if (!data) return null;

  return (
    <details
      className={cn(
        "rounded-lg border border-white/10 bg-black/30 p-3 text-[10px] text-white/50",
        className
      )}
    >
      <summary className="cursor-pointer font-medium uppercase tracking-wider text-white/40">
        Diagnostic Supabase (serveur)
      </summary>
      <ul className="mt-2 space-y-1 font-mono">
        <li>configured: {String(data.configured)}</li>
        <li>publicEnvOk: {String(data.publicEnvOk)}</li>
        <li>url: {data.url ?? "—"}</li>
        <li>anon: {data.anonKeyMasked ?? "absent"} ({data.anonKeyFormat})</li>
        <li>anon=service_role?: {String(data.anonLooksLikeServiceRole)}</li>
        <li>serviceEnvOk: {String(data.serviceEnvOk)}</li>
        {data.browserConfigError && (
          <li className="text-red-300">config: {data.browserConfigError}</li>
        )}
        {data.authHealth && (
          <li>
            auth/health: {data.authHealth.status}{" "}
            {data.authHealth.ok ? "OK" : "FAIL"}
            {data.authHealth.body ? ` — ${data.authHealth.body}` : ""}
          </li>
        )}
      </ul>
    </details>
  );
}
