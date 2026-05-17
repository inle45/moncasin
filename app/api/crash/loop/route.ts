import { NextResponse } from "next/server";
import { runCrashSnapshot } from "@/utils/crash/server-loop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  const snapshot = await runCrashSnapshot();

  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
