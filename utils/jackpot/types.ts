export type JackpotRoundStatus = "waiting" | "counting" | "rolling" | "ended";

export interface JackpotRound {
  id: string;
  round_number: number;
  status: JackpotRoundStatus;
  total_pot: number;
  tax_pool: number;
  winner_id: string | null;
  winner_payout: number | null;
  winning_ticket: number | null;
  counting_ends_at: string | null;
  rolling_started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JackpotBetRow {
  id: string;
  round_id: string;
  user_id: string;
  username: string;
  bet_amount: number;
  ticket_start: number;
  ticket_end: number;
  created_at: string;
}

export interface JackpotPotSegment {
  userId: string;
  username: string;
  betAmount: number;
  ticketStart: number;
  ticketEnd: number;
  percent: number;
  color: string;
}
