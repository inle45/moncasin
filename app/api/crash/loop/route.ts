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
    });
  }

  return NextResponse.json(
    {
      ...snapshot,
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    {
      status: snapshot.state?.round_id ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
