export type CrashPhase = "betting" | "flying" | "crashed";

export interface CrashPublicState {
  round_id: string;
  round_number: number;
  phase: CrashPhase;
  betting_ends_at: string;
  flying_started_at: string | null;
  crashed_at: string | null;
  crash_point: number | null;
}

export interface CrashBetRow {
  id: string;
  round_id: string;
  user_id: string;
  username: string;
  bet_amount: number;
  cashout_multiplier: number | null;
  payout: number | null;
  status: "active" | "cashed_out" | "lost";
}

export interface CrashPresencePlayer {
  user_id: string;
  username: string;
  online_at: string;
}

export interface CrashBroadcastCashout {
  user_id: string;
  username: string;
  multiplier: number;
  payout: number;
}
