import { NextResponse } from "next/server";
import { runCrashSnapshot } from "@/utils/crash/server-loop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Boucle Crash autonome (service role).
 * - Avance les phases jusqu'à être synchronisé
 * - Retourne état + historique + paris
 * Public (spectateurs sans auth) — lecture seule côté jeu.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roundId = searchParams.get("roundId");

  const snapshot = await runCrashSnapshot({
    roundId: roundId ?? undefined,
  });

  if (snapshot.error && !snapshot.state) {
    return NextResponse.json(snapshot, { status: 503 });
  }

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
