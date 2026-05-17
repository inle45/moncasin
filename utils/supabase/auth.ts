import { createClient } from "./client";
import { isDemoMode } from "./config";
import { getBrowserClientConfigError } from "./env";
import { RequestTimeoutError, withTimeout } from "./timeout";

const AUTH_TIMEOUT_MS = 15000;

export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Identifiants incorrects. Vérifie ton email et ton mot de passe.";
  }
  if (lower.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (lower.includes("password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (lower.includes("unable to validate email")) {
    return "Adresse email invalide.";
  }
  if (lower.includes("signup is disabled")) {
    return "Les inscriptions sont temporairement désactivées.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirme ton email avant de te connecter.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Impossible de joindre Supabase. Vérifie ta connexion et les variables NEXT_PUBLIC_* sur Vercel.";
  }
  if (lower.includes("invalid") && lower.includes("api key")) {
    return "Clé API Supabase invalide. Utilise la clé « anon » ou « publishable » (sb_publishable_… ou eyJ…) dans NEXT_PUBLIC_SUPABASE_ANON_KEY — pas la service_role.";
  }

  return message;
}

const DEMO_AUTH_ERROR = {
  message:
    "Mode démo actif : configure NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local pour activer l'authentification.",
};

function authConfigError() {
  if (isDemoMode()) return DEMO_AUTH_ERROR;
  return getBrowserClientConfigError()
    ? { message: getBrowserClientConfigError()! }
    : null;
}

export async function signInWithEmail(email: string, password: string) {
  const configErr = authConfigError();
  if (configErr) {
    return {
      data: { user: null, session: null },
      error: configErr,
    } as const;
  }

  const supabase = createClient();
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: {
        message:
          getBrowserClientConfigError() ??
          "Client Supabase indisponible. Vérifie la clé ANON sur Vercel.",
      },
    } as const;
  }

  try {
    return await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      "auth.signIn"
    );
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      return {
        data: { user: null, session: null },
        error: {
          message:
            "Connexion trop lente — réessaie dans quelques secondes. Si le problème persiste, vérifie que NEXT_PUBLIC_SUPABASE_ANON_KEY est bien la clé publique (anon), pas la service_role.",
        },
      } as const;
    }
    return {
      data: { user: null, session: null },
      error: {
        message: translateAuthError(
          err instanceof Error ? err.message : "Erreur de connexion"
        ),
      },
    } as const;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
) {
  const configErr = authConfigError();
  if (configErr) {
    return {
      data: { user: null, session: null },
      error: configErr,
    } as const;
  }

  const supabase = createClient();
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: {
        message:
          getBrowserClientConfigError() ??
          "Client Supabase indisponible. Vérifie la clé ANON sur Vercel.",
      },
    } as const;
  }

  try {
    return await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      }),
      AUTH_TIMEOUT_MS,
      "auth.signUp"
    );
  } catch (err) {
    if (err instanceof RequestTimeoutError) {
      return {
        data: { user: null, session: null },
        error: {
          message:
            "Inscription trop lente — réessaie. Vérifie la clé ANON (publique) sur Vercel.",
        },
      } as const;
    }
    return {
      data: { user: null, session: null },
      error: {
        message: translateAuthError(
          err instanceof Error ? err.message : "Erreur d'inscription"
        ),
      },
    } as const;
  }
}

export async function signOut() {
  if (isDemoMode()) return { error: null };

  const supabase = createClient();
  if (!supabase) return { error: null };

  try {
    return await withTimeout(supabase.auth.signOut(), AUTH_TIMEOUT_MS, "auth.signOut");
  } catch {
    return { error: null };
  }
}
