/** Affiche un cadre néon VIP autour de l'avatar. */
export function hasVipAvatarFrame(
  vipStatus?: string | null,
  profileFrame?: string | null
): boolean {
  const frame = (profileFrame ?? "").trim().toLowerCase();
  if (frame && frame !== "none" && frame !== "default" && frame !== "joueur") {
    return true;
  }
  const tier = (vipStatus ?? "Joueur").trim().toUpperCase();
  return tier === "VIP" || tier === "VIP+" || tier.startsWith("VIP");
}

export function profileInitials(username?: string | null): string {
  const name = (username ?? "J").trim();
  if (!name) return "J";
  const parts = name.split(/[\s_]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function isValidAvatarUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return true;
  try {
    const parsed = new URL(t);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
