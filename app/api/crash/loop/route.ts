import { NextResponse } from "next/server";
import { runCrashSnapshot } from "@/utils/crash/server-loop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const snapshot = await runCrashSnapshot();

  if (snapshot.error) {
    console.error("[MonCasin /api/crash/loop]", snapshot.error, {
      source: snapshot.source,
      needsAdvance: snapshot.needsAdvance,
      tickLog: snapshot.tickLog,
    });
  }

  const ok = Boolean(snapshot.state?.round_id) && !snapshot.needsAdvance;

  return NextResponse.json(snapshot, {
    status: ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
