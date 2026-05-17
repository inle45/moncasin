import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Filet de sécurité : avance la boucle Crash même sans joueur connecté.
 * Vercel Cron (vercel.json) appelle cette route chaque minute avec CRON_SECRET.
 * Les clients appellent aussi crash_advance_tick toutes les 250 ms en direct.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant sur Vercel",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("crash_advance_tick");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: data });
}
