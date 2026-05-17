const STORAGE_PREFIX = "moncasin_owned_";
const DEMO_KEY = "moncasin_owned_demo";

export function getInventoryKey(userId: string | null): string {
  return userId ? `${STORAGE_PREFIX}${userId}` : DEMO_KEY;
}

export function loadOwnedItems(userId: string | null): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getInventoryKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOwnedItems(
  userId: string | null,
  itemIds: string[]
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getInventoryKey(userId), JSON.stringify(itemIds));
}

export function addOwnedItem(
  userId: string | null,
  itemId: string
): string[] {
  const current = loadOwnedItems(userId);
  if (current.includes(itemId)) return current;
  const next = [...current, itemId];
  saveOwnedItems(userId, next);
  return next;
}

export function ownsItem(
  ownedIds: string[],
  itemId: string
): boolean {
  return ownedIds.includes(itemId);
}
