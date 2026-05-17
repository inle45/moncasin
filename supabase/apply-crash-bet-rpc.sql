-- =============================================================================
-- MonCasin — À exécuter dans Supabase → SQL Editor (une seule fois)
-- Corrige : "Could not find the function public.crash_place_bet(p_amount)"
-- =============================================================================

-- Tables minimales (ignorées si déjà créées par crash-multiplayer.sql)
create table if not exists public.crash_live_state (
  id int primary key default 1 check (id = 1),
  round_id uuid not null default gen_random_uuid(),
  round_number bigint not null default 1,
  phase text not null default 'betting'
    check (phase in ('betting', 'flying', 'crashed')),
  crash_point numeric(12, 2) not null default 2.00,
  betting_ends_at timestamptz not null default (now() + interval '5 seconds'),
  flying_started_at timestamptz,
  crashed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.crash_bets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null default 'Joueur',
  bet_amount bigint not null check (bet_amount > 0),
  cashout_multiplier numeric(12, 2),
  payout bigint,
  status text not null default 'active'
    check (status in ('active', 'cashed_out', 'lost')),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create index if not exists crash_bets_round_id_idx on public.crash_bets (round_id);

insert into public.crash_live_state (id, betting_ends_at, crash_point)
values (1, now() + interval '5 seconds', 2.00)
on conflict (id) do nothing;

create or replace function public.crash_current_multiplier(p_started_at timestamptz)
returns numeric
language sql
stable
set search_path = public
as $$
  select floor(exp(0.12 * extract(epoch from (now() - p_started_at))) * 100) / 100;
$$;

-- Mise : déduit le solde profil + insère dans crash_bets
create or replace function public.crash_place_bet(p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.crash_live_state%rowtype;
  uid uuid := auth.uid();
  uname text;
  bal bigint;
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;

  select * into s from public.crash_live_state where id = 1;
  if not found then
    raise exception 'Room crash introuvable';
  end if;

  if s.phase <> 'betting' or now() >= s.betting_ends_at then
    raise exception 'Les mises sont fermées';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Mise invalide';
  end if;

  select coalesce(username, 'Joueur'), balance::bigint
  into uname, bal
  from public.profiles
  where id = uid
  for update;

  if not found then
    raise exception 'Profil introuvable';
  end if;

  if bal < p_amount then
    raise exception 'Solde insuffisant';
  end if;

  if exists (
    select 1 from public.crash_bets
    where round_id = s.round_id and user_id = uid
  ) then
    raise exception 'Mise déjà placée pour cette manche';
  end if;

  update public.profiles
  set balance = balance - p_amount,
      updated_at = now()
  where id = uid;

  insert into public.crash_bets (round_id, user_id, username, bet_amount)
  values (s.round_id, uid, uname, p_amount);

  return jsonb_build_object('ok', true, 'balance', bal - p_amount);
end;
$$;

-- Cashout (nécessaire juste après pour ne pas avoir la même erreur)
create or replace function public.crash_cashout(p_multiplier numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.crash_live_state%rowtype;
  uid uuid := auth.uid();
  b public.crash_bets%rowtype;
  server_mult numeric;
  final_mult numeric;
  payout bigint;
  new_bal bigint;
begin
  if uid is null then
    raise exception 'Non authentifié';
  end if;

  select * into s from public.crash_live_state where id = 1;
  if s.phase <> 'flying' or s.flying_started_at is null then
    raise exception 'Cashout impossible maintenant';
  end if;

  server_mult := public.crash_current_multiplier(s.flying_started_at);
  if server_mult >= s.crash_point then
    raise exception 'Trop tard, la fusée a crashé';
  end if;

  final_mult := least(p_multiplier, server_mult);
  final_mult := greatest(1, floor(final_mult * 100) / 100);

  select * into b
  from public.crash_bets
  where round_id = s.round_id and user_id = uid and status = 'active'
  for update;

  if not found then
    raise exception 'Aucune mise active';
  end if;

  payout := floor(b.bet_amount * final_mult);

  update public.crash_bets
  set status = 'cashed_out',
      cashout_multiplier = final_mult,
      payout = payout
  where id = b.id;

  update public.profiles
  set balance = balance + payout,
      updated_at = now()
  where id = uid
  returning balance::bigint into new_bal;

  return jsonb_build_object(
    'ok', true,
    'multiplier', final_mult,
    'payout', payout,
    'balance', new_bal
  );
end;
$$;

grant execute on function public.crash_place_bet(bigint) to authenticated;
grant execute on function public.crash_cashout(numeric) to authenticated;

-- Rafraîchit le cache PostgREST (schema cache)
notify pgrst, 'reload schema';
