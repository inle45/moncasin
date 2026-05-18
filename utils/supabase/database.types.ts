export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          balance: number;
          xp: number;
          vip_status: string;
          avatar_url: string | null;
          profile_frame: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          balance?: number;
          xp?: number;
          vip_status?: string;
          avatar_url?: string | null;
          profile_frame?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          balance?: number;
          xp?: number;
          vip_status?: string;
          avatar_url?: string | null;
          profile_frame?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      progressive_jackpots: {
        Row: {
          tier: string;
          amount: number;
          updated_at: string;
        };
        Insert: {
          tier: string;
          amount?: number;
          updated_at?: string;
        };
        Update: {
          tier?: string;
          amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      crash_live_state: {
        Row: {
          id: number;
          round_id: string;
          round_number: number;
          phase: string;
          crash_point: number;
          betting_ends_at: string;
          flying_started_at: string | null;
          crashed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          round_id?: string;
          round_number?: number;
          phase?: string;
          crash_point?: number;
          betting_ends_at?: string;
          flying_started_at?: string | null;
          crashed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          round_id?: string;
          round_number?: number;
          phase?: string;
          crash_point?: number;
          betting_ends_at?: string;
          flying_started_at?: string | null;
          crashed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      crash_bets: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          username: string;
          bet_amount: number;
          cashout_multiplier: number | null;
          payout: number | null;
          status: string;
          bet_slot: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          user_id: string;
          username?: string;
          bet_amount: number;
          cashout_multiplier?: number | null;
          payout?: number | null;
          status?: string;
          bet_slot?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          user_id?: string;
          username?: string;
          bet_amount?: number;
          cashout_multiplier?: number | null;
          payout?: number | null;
          status?: string;
          bet_slot?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      crash_round_history: {
        Row: {
          id: number;
          round_number: number;
          crash_point: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          round_number: number;
          crash_point: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          round_number?: number;
          crash_point?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      jackpot_meta: {
        Row: {
          id: number;
          tax_pool: number;
          updated_at: string;
        };
        Insert: {
          id?: number;
          tax_pool?: number;
          updated_at?: string;
        };
        Update: {
          id?: number;
          tax_pool?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      jackpot_rounds: {
        Row: {
          id: string;
          round_number: number;
          status: string;
          total_pot: number;
          tax_pool: number;
          winner_id: string | null;
          winner_payout: number | null;
          winning_ticket: number | null;
          started_at: string | null;
          counting_ends_at: string | null;
          rolling_started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          round_number?: number;
          status?: string;
          total_pot?: number;
          tax_pool?: number;
          winner_id?: string | null;
          winner_payout?: number | null;
          winning_ticket?: number | null;
          started_at?: string | null;
          counting_ends_at?: string | null;
          rolling_started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          round_number?: number;
          status?: string;
          total_pot?: number;
          tax_pool?: number;
          winner_id?: string | null;
          winner_payout?: number | null;
          winning_ticket?: number | null;
          started_at?: string | null;
          counting_ends_at?: string | null;
          rolling_started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jackpot_bets: {
        Row: {
          id: string;
          round_id: string;
          user_id: string;
          username: string;
          bet_amount: number;
          ticket_start: number;
          ticket_end: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          round_id: string;
          user_id: string;
          username?: string;
          bet_amount: number;
          ticket_start: number;
          ticket_end: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          round_id?: string;
          user_id?: string;
          username?: string;
          bet_amount?: number;
          ticket_start?: number;
          ticket_end?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      crash_repair_live_state: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      crash_get_state: {
        Args: Record<string, never>;
        Returns: Json;
      };
      crash_advance_tick: {
        Args: Record<string, never>;
        Returns: Json;
      };
      crash_server_now: {
        Args: Record<string, never>;
        Returns: string;
      };
      crash_place_bet: {
        Args: { p_amount: number };
        Returns: Json;
      };
      crash_cashout: {
        Args: { p_multiplier: number };
        Returns: Json;
      };
      jackpot_place_bet: {
        Args: { p_amount: number };
        Returns: Json;
      };
      enter_jackpot_arena: {
        Args: { p_amount: number };
        Returns: Json;
      };
      jackpot_advance_tick: {
        Args: Record<string, never>;
        Returns: Json;
      };
      trigger_jackpot_roll: {
        Args: { p_round_id: string };
        Returns: Json;
      };
      complete_jackpot_round: {
        Args: { p_round_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
