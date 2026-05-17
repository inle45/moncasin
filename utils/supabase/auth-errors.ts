import type { AuthError } from "@supabase/supabase-js";
import { RequestTimeoutError } from "./timeout";

export interface AuthErrorDetails {
  /** Message principal (brut Supabase si disponible). */
  message: string;
  status?: number;
  code?: string;
  name?: string;
  isTimeout: boolean;
  isConfig: boolean;
  /** JSON sérialisé de l'erreur complète pour diagnostic. */
  raw: string;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(
      value,
      (_, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v),
      2
    );
  } catch {
    return String(value);
  }
}

export function extractAuthErrorDetails(
  error: unknown,
  options?: { isConfig?: boolean; isTimeout?: boolean }
): AuthErrorDetails {
  if (error instanceof RequestTimeoutError) {
    return {
      message: error.message,
      isTimeout: true,
      isConfig: false,
      name: error.name,
      raw: safeStringify({ type: "timeout", ms: error.message }),
    };
  }

  const authErr = error as AuthError | null;
  const message =
    authErr?.message ??
    (error instanceof Error ? error.message : String(error ?? "Erreur inconnue"));

  return {
    message,
    status: authErr?.status,
    code: authErr?.code,
    name: authErr?.name ?? (error instanceof Error ? error.name : undefined),
    isTimeout: options?.isTimeout ?? false,
    isConfig: options?.isConfig ?? false,
    raw: safeStringify(error),
  };
}

/** Texte multi-lignes pour l'UI /auth (erreur brute + métadonnées). */
export function formatAuthErrorForDisplay(details: AuthErrorDetails): string {
  const lines: string[] = [details.message];

  if (details.code) lines.push(`Code Supabase : ${details.code}`);
  if (details.status != null) lines.push(`HTTP : ${details.status}`);
  if (details.name) lines.push(`Type : ${details.name}`);
  if (details.isTimeout) lines.push("(Délai dépassé côté client)");
  if (details.isConfig) lines.push("(Erreur de configuration des variables d'environnement)");

  lines.push("", "— Détail brut —", details.raw);

  return lines.join("\n");
}
