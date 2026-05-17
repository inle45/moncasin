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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          balance?: number;
          xp?: number;
          vip_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          balance?: number;
          xp?: number;
          vip_status?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
