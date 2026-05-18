-- Double mise par joueur (2 paris indépendants par manche)
-- Exécuter dans Supabase → SQL Editor

alter table public.crash_bets
  add column if not exists bet_slot smallint not null default 0
  check (bet_slot in (0, 1));

alter table public.crash_bets
  drop constraint if exists crash_bets_round_id_user_id_key;

alter table public.crash_bets
  add constraint crash_bets_round_user_slot_key unique (round_id, user_id, bet_slot);

notify pgrst, 'reload schema';
