import { NextResponse } from "next/server";
import { runCrashSnapshot } from "@/utils/crash/server-loop";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Cron Vercel — délègue à la boucle serveur autonome. */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const snapshot = await runCrashSnapshot();
  if (snapshot.error && !snapshot.state) {
    return NextResponse.json({ error: snapshot.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true, ...snapshot });
}
