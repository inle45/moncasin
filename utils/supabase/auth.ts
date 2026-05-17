import { createClient } from "./client";
import { isDemoMode } from "./config";
import { withTimeout } from "./timeout";

const AUTH_TIMEOUT_MS = 5000;

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
    return "Impossible de joindre Supabase. Vérifie ta connexion et le fichier .env.local.";
  }
  if (lower.includes("invalid") && lower.includes("api key")) {
    return "Clé API Supabase invalide. Ouvre Supabase → Settings → API Keys, copie la clé « anon public » (onglet Legacy, commence par eyJ…) ou la clé « publishable » complète (sb_publishable_…), mets-la dans .env.local puis redémarre npm run dev.";
  }

  return message;
}

const DEMO_AUTH_ERROR = {
  message:
    "Mode démo actif : configure NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local pour activer l'authentification.",
};

export async function signInWithEmail(email: string, password: string) {
  if (isDemoMode()) {
    return {
      data: { user: null, session: null },
      error: DEMO_AUTH_ERROR,
    } as const;
  }

  const supabase = createClient();
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: DEMO_AUTH_ERROR,
    } as const;
  }

  try {
    return await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      "auth.signIn"
    );
  } catch {
    return {
      data: { user: null, session: null },
      error: { message: "Connexion expirée — vérifie Supabase ou joue en mode démo." },
    } as const;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
) {
  if (isDemoMode()) {
    return {
      data: { user: null, session: null },
      error: DEMO_AUTH_ERROR,
    } as const;
  }

  const supabase = createClient();
  if (!supabase) {
    return {
      data: { user: null, session: null },
      error: DEMO_AUTH_ERROR,
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
  } catch {
    return {
      data: { user: null, session: null },
      error: { message: "Inscription expirée — vérifie Supabase ou joue en mode démo." },
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
