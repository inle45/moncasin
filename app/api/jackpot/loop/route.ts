import { NextResponse } from "next/server";
import { runJackpotLoopTick } from "@/utils/jackpot/advance-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { round, serverNowMs, errors } = await runJackpotLoopTick();

  return NextResponse.json(
    { round, serverNowMs, errors, ok: Boolean(round) },
    {
      status: round ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
