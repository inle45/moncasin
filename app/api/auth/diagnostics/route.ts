import { NextResponse } from "next/server";
import {
  getBrowserClientConfigError,
  getPublicSupabaseEnv,
  getServiceSupabaseEnv,
  isServiceRoleKey,
} from "@/utils/supabase/env";
import { isSupabaseConfigured, normalizeAnonKey } from "@/utils/supabase/config";

export const dynamic = "force-dynamic";

function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

/** Diagnostic serveur (ne expose jamais les clés complètes). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const anonNorm = normalizeAnonKey(anonRaw);
  const serviceRaw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  const publicEnv = getPublicSupabaseEnv();
  const serviceEnv = getServiceSupabaseEnv();

  let authHealth: { ok: boolean; status: number; body?: string } | null = null;

  if (publicEnv) {
    try {
      const res = await fetch(`${publicEnv.url}/auth/v1/health`, {
        headers: {
          apikey: publicEnv.anonKey,
          Authorization: `Bearer ${publicEnv.anonKey}`,
        },
        cache: "no-store",
      });
      const body = await res.text();
      authHealth = { ok: res.ok, status: res.status, body: body.slice(0, 200) };
    } catch (err) {
      authHealth = {
        ok: false,
        status: 0,
        body: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return NextResponse.json({
    configured: isSupabaseConfigured(),
    browserConfigError: getBrowserClientConfigError(),
    url: url ? new URL(url).hostname : null,
    anonKeyPresent: !!anonRaw,
    anonKeyMasked: anonRaw ? maskKey(anonNorm) : null,
    anonKeyFormat: anonNorm.startsWith("eyJ")
      ? "jwt"
      : anonNorm.startsWith("sb_publishable_")
        ? "publishable"
        : "unknown",
    anonLooksLikeServiceRole: isServiceRoleKey(anonNorm),
    publicEnvOk: !!publicEnv,
    serviceKeyPresent: !!serviceRaw,
    serviceKeyMasked: serviceRaw ? maskKey(serviceRaw) : null,
    serviceEnvOk: !!serviceEnv,
    authHealth,
    serverTime: new Date().toISOString(),
  });
}
