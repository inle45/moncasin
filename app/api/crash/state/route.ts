import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/admin";
import { parseCrashState } from "@/utils/crash/parse-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lecture seule de l'état (réparation incluse via crash_get_state). */
export async function GET() {
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquant" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("crash_get_state");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const state = parseCrashState(data);
  return NextResponse.json({
    state,
    serverTime: Date.now(),
  });
}
