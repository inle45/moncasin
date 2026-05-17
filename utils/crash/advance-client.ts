import { parseCrashState } from "@/utils/crash/parse-state";
import { logCrashTick } from "@/utils/crash/tick-log";
import type { CrashPublicState } from "@/utils/crash/types";
import {
  advanceCrashTick,
  fetchCrashStateFromTable,
} from "@/utils/supabase/crash-room";

export type CrashTickSource = "rpc" | "api" | "table" | "none";

export interface CrashLoopTickResult {
  state: CrashPublicState | null;
  source: CrashTickSource;
  errors: string[];
}

/** Signature stable pour éviter les re-renders inutiles (chrono 4↔3). */
export function crashStateSignature(state: CrashPublicState): string {
  return [
    state.phase,
    state.round_id,
    state.round_number,
    state.betting_ends_at ?? "",
    state.flying_started_at ?? "",
    state.crashed_at ?? "",
    state.crash_point ?? "",
  ].join("|");
}

/**
 * Avance la manche : RPC client → API serveur (/api/crash/loop) → lecture table.
 */
export async function runCrashLoopTick(): Promise<CrashLoopTickResult> {
  const errors: string[] = [];

  const rpc = await advanceCrashTick();
  if (rpc.data && !rpc.error) {
    logCrashTick("info", "OK via crash_advance_tick (RPC)", {
      phase: rpc.data.phase,
      round_id: rpc.data.round_id,
    });
    return { state: rpc.data, source: "rpc", errors };
  }

  const rpcErr = rpc.error ?? "RPC sans données";
  errors.push(`RPC crash_advance_tick: ${rpcErr}`);
  logCrashTick("error", "Échec crash_advance_tick", rpcErr);

  try {
    const res = await fetch("/api/crash/loop", {
      cache: "no-store",
      method: "GET",
    });

    const rawText = await res.text();
    let body: { state?: unknown; error?: string | null; source?: string } = {};
    try {
      body = rawText ? (JSON.parse(rawText) as typeof body) : {};
    } catch {
      errors.push("API /api/crash/loop: réponse JSON invalide");
      logCrashTick("error", "JSON invalide /api/crash/loop", rawText.slice(0, 500));
    }

    if (!res.ok) {
      const msg = body.error ?? `HTTP ${res.status}`;
      errors.push(`API /api/crash/loop: ${msg}`);
      logCrashTick("error", `HTTP ${res.status} /api/crash/loop`, {
        error: body.error,
        source: body.source,
        snippet: rawText.slice(0, 500),
      });
    } else {
      const fromApi = parseCrashState(body.state);
      if (fromApi) {
        if (body.error) {
          errors.push(`API avertissement: ${body.error}`);
          logCrashTick("warn", "API loop avec avertissement", body.error);
        } else {
          logCrashTick("info", "OK via /api/crash/loop", {
            phase: fromApi.phase,
            apiSource: body.source,
          });
        }
        return { state: fromApi, source: "api", errors };
      }

      errors.push("API /api/crash/loop: état invalide dans la réponse");
      logCrashTick("error", "État API invalide", body.state);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Fetch /api/crash/loop: ${msg}`);
    logCrashTick("error", "Exception fetch /api/crash/loop", err);
  }

  const table = await fetchCrashStateFromTable();
  if (table.data) {
    errors.push(
      "Lecture table seule (la manche n'a peut‑être pas avancé — vérifier RPC/API)"
    );
    logCrashTick("warn", "Fallback lecture crash_live_state (pas d'avance garantie)", {
      phase: table.data.phase,
      tableError: table.error,
    });
    return { state: table.data, source: "table", errors };
  }

  if (table.error) {
    errors.push(`Table crash_live_state: ${table.error}`);
    logCrashTick("error", "Lecture table impossible", table.error);
  }

  return { state: null, source: "none", errors };
}

/** @deprecated Utiliser runCrashLoopTick */
export async function advanceCrashFromClient(): Promise<CrashPublicState | null> {
  const result = await runCrashLoopTick();
  return result.state;
}
