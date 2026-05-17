/**
 * Persistance du dernier tour de roue quotidienne.
 * À brancher sur Supabase lorsque la colonne `last_daily_wheel_at`
 * sera ajoutée à la table `profiles`.
 */

export async function fetchLastWheelSpinFromDb(
  _userId: string
): Promise<{ lastSpinAt: number | null; error: string | null }> {
  // TODO: supabase.from("profiles").select("last_daily_wheel_at").eq("id", userId)
  return { lastSpinAt: null, error: null };
}

export async function saveLastWheelSpinToDb(
  _userId: string,
  _timestamp: number
): Promise<{ error: string | null }> {
  // TODO: supabase.from("profiles").update({ last_daily_wheel_at: new Date(timestamp).toISOString() })
  return { error: null };
}
