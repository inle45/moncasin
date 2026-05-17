S -- =============================================================================
-- MonCasin.fr — Schéma Supabase (profiles + auth)
-- Exécuter dans : Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Table profils liée à auth.users
create table if not exists public.profiles (
  id uuid not null references auth.users (id) on delete cascade,
  username text,
  balance bigint not null default 1000 check (balance >= 0),
  xp integer not null default 0 check (xp >= 0),
  vip_status text not null default 'Joueur',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_username_key unique (username)
);

comment on table public.profiles is 'Profil joueur MonCasin (solde, XP, VIP)';
comment on column public.profiles.balance is 'Solde en jetons';

-- Index utiles
create index if not exists profiles_username_idx on public.profiles (username);

-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Création automatique du profil à l''inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'username',
      split_part(new.email, '@', 1),
      'Joueur_' || left(new.id::text, 8)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

alter table public.profiles enable row level security;

drop policy if exists "Profiles: lecture par le propriétaire" on public.profiles;
create policy "Profiles: lecture par le propriétaire"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Profiles: lecture classement (top 100)" on public.profiles;
create policy "Profiles: lecture classement (top 100)"
  on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "Profiles: mise à jour par le propriétaire" on public.profiles;
create policy "Profiles: mise à jour par le propriétaire"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Pas d''insert manuel côté client (réservé au trigger signup)
drop policy if exists "Profiles: pas d''insert client" on public.profiles;
-- (aucune policy INSERT = refus par défaut pour authenticated)

-- =============================================================================
-- Jackpots progressifs (machine à sous)
-- =============================================================================

create table if not exists public.progressive_jackpots (
  tier text not null,
  amount bigint not null default 1000 check (amount >= 0),
  updated_at timestamptz not null default now(),
  constraint progressive_jackpots_pkey primary key (tier),
  constraint progressive_jackpots_tier_check check (
    tier in ('mini', 'minor', 'major', 'grand')
  )
);

comment on table public.progressive_jackpots is 'Cagnottes progressives partagées (slot)';

insert into public.progressive_jackpots (tier, amount)
values
  ('mini', 5000),
  ('minor', 25000),
  ('major', 100000),
  ('grand', 500000)
on conflict (tier) do nothing;

alter table public.progressive_jackpots enable row level security;

drop policy if exists "Jackpots: lecture publique" on public.progressive_jackpots;
create policy "Jackpots: lecture publique"
  on public.progressive_jackpots
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Jackpots: insert authentifié" on public.progressive_jackpots;
create policy "Jackpots: insert authentifié"
  on public.progressive_jackpots
  for insert
  to authenticated
  with check (true);

drop policy if exists "Jackpots: mise à jour authentifiée" on public.progressive_jackpots;
create policy "Jackpots: mise à jour authentifiée"
  on public.progressive_jackpots
  for update
  to authenticated
  using (true)
  with check (true);
