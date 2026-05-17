import { DAILY_COOLDOWN_MS } from "./constants";

const DEMO_LAST_SPIN_KEY = "moncasin_demo_wheel_last_spin";
const USER_LAST_SPIN_PREFIX = "moncasin_wheel_last_spin_";

export function getNextSpinAt(lastSpinAt: number | null): number | null {
  if (!lastSpinAt) return null;
  return lastSpinAt + DAILY_COOLDOWN_MS;
}

export function canSpinNow(lastSpinAt: number | null, now = Date.now()): boolean {
  if (!lastSpinAt) return true;
  return now >= lastSpinAt + DAILY_COOLDOWN_MS;
}

export function getRemainingCooldownMs(
  lastSpinAt: number | null,
  now = Date.now()
): number {
  if (!lastSpinAt) return 0;
  const next = lastSpinAt + DAILY_COOLDOWN_MS;
  return Math.max(0, next - now);
}

export function loadDemoLastSpin(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_LAST_SPIN_KEY);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export function saveDemoLastSpin(timestamp: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_LAST_SPIN_KEY, String(timestamp));
}

export function clearDemoLastSpin(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_LAST_SPIN_KEY);
}

export function loadUserLastSpin(userId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`${USER_LAST_SPIN_PREFIX}${userId}`);
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export function saveUserLastSpin(userId: string, timestamp: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${USER_LAST_SPIN_PREFIX}${userId}`, String(timestamp));
}

export function clearUserLastSpin(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${USER_LAST_SPIN_PREFIX}${userId}`);
}
