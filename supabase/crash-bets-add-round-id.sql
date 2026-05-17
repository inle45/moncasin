-- =============================================================================
-- Corrige crash_bets si la table existait SANS round_id (cache PostgREST)
-- Exécuter dans Supabase → SQL Editor
-- =============================================================================

-- Colonnes attendues par l'app (alignées sur crash-multiplayer.sql)
alter table public.crash_bets add column if not exists round_id uuid;
alter table public.crash_bets add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.crash_bets add column if not exists username text not null default 'Joueur';
alter table public.crash_bets add column if not exists bet_amount bigint;
alter table public.crash_bets add column if not exists cashout_multiplier numeric(12, 2);
alter table public.crash_bets add column if not exists payout bigint;
alter table public.crash_bets add column if not exists status text not null default 'active';
alter table public.crash_bets add column if not exists created_at timestamptz not null default now();

-- Remplir round_id pour les lignes orphelines
update public.crash_bets b
set round_id = s.round_id
from public.crash_live_state s
where s.id = 1
  and b.round_id is null;

-- Contraintes (ignorer si déjà présentes)
do $$
begin
  alter table public.crash_bets alter column round_id set not null;
exception
  when others then null;
end $$;

do $$
begin
  alter table public.crash_bets add constraint crash_bets_round_user_key unique (round_id, user_id);
exception
  when duplicate_object then null;
end $$;

create index if not exists crash_bets_round_id_idx on public.crash_bets (round_id);

notify pgrst, 'reload schema';
