import type { AuthError, Session, User } from "@supabase/supabase-js";
import { createClient } from "./client";
import { isDemoMode } from "./config";
import { getBrowserClientConfigError } from "./env";
import {
  extractAuthErrorDetails,
  type AuthErrorDetails,
} from "./auth-errors";
import { RequestTimeoutError, withTimeout } from "./timeout";

const AUTH_TIMEOUT_MS = 30000;

export type AuthOperationResult = {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
  details: AuthErrorDetails | null;
};

const DEMO_DETAILS: AuthErrorDetails = {
  message:
    "Mode démo actif : configure NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  isTimeout: false,
  isConfig: true,
  raw: JSON.stringify({ mode: "demo" }, null, 2),
};

function configFailure(): AuthOperationResult | null {
  if (isDemoMode()) {
    return {
      data: { user: null, session: null },
      error: { message: DEMO_DETAILS.message, name: "DemoMode", status: 503 } as AuthError,
      details: DEMO_DETAILS,
    };
  }

  const configMsg = getBrowserClientConfigError();
  if (configMsg) {
    const details = extractAuthErrorDetails(
      { message: configMsg, name: "ConfigError", status: 503 },
      { isConfig: true }
    );
    return {
      data: { user: null, session: null },
      error: { message: configMsg, name: "ConfigError", status: 503 } as AuthError,
      details,
    };
  }

  return null;
}

async function runAuthOperation(
  label: string,
  operation: (
    supabase: NonNullable<ReturnType<typeof createClient>>
  ) => Promise<{
    data: { user: User | null; session: Session | null };
    error: AuthError | null;
  }>
): Promise<AuthOperationResult> {
  const configResult = configFailure();
  if (configResult) return configResult;

  const supabase = createClient();
  if (!supabase) {
    const msg =
      getBrowserClientConfigError() ??
      "Client Supabase navigateur indisponible (clé ANON / URL).";
    const details = extractAuthErrorDetails(
      { message: msg, name: "ClientUnavailable", status: 503 },
      { isConfig: true }
    );
    return {
      data: { user: null, session: null },
      error: { message: msg, name: "ClientUnavailable", status: 503 } as AuthError,
      details,
    };
  }

  try {
    const result = await withTimeout(operation(supabase), AUTH_TIMEOUT_MS, label);

    if (result.error) {
      return {
        data: result.data,
        error: result.error,
        details: extractAuthErrorDetails(result.error),
      };
    }

    return { data: result.data, error: null, details: null };
  } catch (err) {
    const details = extractAuthErrorDetails(err, {
      isTimeout: err instanceof RequestTimeoutError,
    });
    return {
      data: { user: null, session: null },
      error: {
        message: details.message,
        name: details.name ?? "AuthError",
        status: details.status ?? (details.isTimeout ? 408 : 500),
        code: details.code,
      } as AuthError,
      details,
    };
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthOperationResult> {
  const configResult = configFailure();
  if (configResult) {
    if (configResult.error) {
      alert(JSON.stringify(configResult.error));
    }
    return configResult;
  }

  const supabase = createClient();
  if (!supabase) {
    const err = {
      message:
        getBrowserClientConfigError() ??
        "Client Supabase navigateur indisponible.",
      name: "ClientUnavailable",
      status: 503,
    };
    alert(JSON.stringify(err));
    const details = extractAuthErrorDetails(err, { isConfig: true });
    return {
      data: { user: null, session: null },
      error: err as AuthError,
      details,
    };
  }

  try {
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      alert(JSON.stringify(result.error));
      return {
        data: result.data,
        error: result.error,
        details: extractAuthErrorDetails(result.error),
      };
    }

    return { data: result.data, error: null, details: null };
  } catch (error) {
    alert(JSON.stringify(error));
    const details = extractAuthErrorDetails(error);
    return {
      data: { user: null, session: null },
      error: {
        message: details.message,
        name: details.name ?? "AuthError",
        status: details.status ?? 500,
        code: details.code,
      } as AuthError,
      details,
    };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  username: string
): Promise<AuthOperationResult> {
  return runAuthOperation("auth.signUp", (supabase) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
  );
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

/** @deprecated Utiliser details + formatAuthErrorForDisplay sur /auth */
export function translateAuthError(message: string): string {
  return message;
}
