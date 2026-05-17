import { updateProfileBalance } from "@/utils/supabase/profiles";
import { withTimeout } from "@/utils/supabase/timeout";

const SYNC_TIMEOUT_MS = 4000;

/** Écrit le solde en base sans bloquer l'UI (fire-and-forget). */
export function syncCrashBalanceQuiet(
  userId: string,
  balance: number
): void {
  void withTimeout(
    updateProfileBalance(userId, balance),
    SYNC_TIMEOUT_MS,
    "sync crash solde"
  )
    .then(({ error }) => {
      if (error && typeof console !== "undefined") {
        console.warn("[crash] sync solde:", error);
      }
    })
    .catch(() => {
      /* timeout ou réseau — solde local conservé */
    });
}
