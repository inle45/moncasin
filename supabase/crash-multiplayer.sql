-- =============================================================================
-- MonCasin — Crash multijoueur synchronisé (Realtime + RPC)
-- Exécuter dans Supabase Dashboard → SQL Editor
-- Activer aussi : Database → Replication → crash_live_state, crash_bets
-- =============================================================================

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

create table if not exists public.crash_round_history (
  id bigint generated always as identity primary key,
  round_number bigint not null,
  crash_point numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

insert into public.crash_live_state (id, betting_ends_at, crash_point)
values (1, now() + interval '5 seconds', 2.00)
on conflict (id) do update
set
  betting_ends_at = coalesce(
    public.crash_live_state.betting_ends_at,
    excluded.betting_ends_at
  ),
  crash_point = case
    when public.crash_live_state.crash_point is null
      or public.crash_live_state.crash_point < 1.01
    then excluded.crash_point
    else public.crash_live_state.crash_point
  end;

-- =============================================================================
-- Helpers
-- =============================================================================

create or replace function public.crash_random_point()
returns numeric
language plpgsql
as $$
declare
  r double precision := random();
  raw numeric;
begin
  raw := (1 - 0.04) / (1 - r);
  return greatest(1.01, least(500, floor(raw * 100) / 100));
end;
$$;

create or replace function public.crash_current_multiplier(p_started_at timestamptz)
returns numeric
language sql
stable
as $$
  select round(
    (power(1.06, greatest(0, extract(epoch from (clock_timestamp() - p_started_at))))::numeric)
    * 100
  ) / 100;
$$;

-- =============================================================================
-- Réparation automatique (dates NULL, phase invalide)
-- =============================================================================

create or replace function public.crash_repair_live_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.crash_live_state%rowtype;
begin
  insert into public.crash_live_state (id, betting_ends_at, crash_point)
  values (1, now() + interval '5 seconds', public.crash_random_point())
  on conflict (id) do nothing;

  select * into s from public.crash_live_state where id = 1 for update;
  if not found then
    return;
  end if;

  if s.betting_ends_at is null and s.phase = 'betting' then
    update public.crash_live_state
    set betting_ends_at = now() + interval '5 seconds',
        updated_at = now()
    where id = 1;
  end if;

  if s.crash_point is null or s.crash_point < 1.01 then
    update public.crash_live_state
    set crash_point = public.crash_random_point(),
        updated_at = now()
    where id = 1;
  end if;

  if s.phase = 'flying' and s.flying_started_at is null then
    update public.crash_live_state
    set flying_started_at = now(),
        updated_at = now()
    where id = 1;
  end if;

  if s.phase = 'crashed' and s.crashed_at is null then
    update public.crash_live_state
    set crashed_at = now(),
        updated_at = now()
    where id = 1;
  end if;

  if s.phase not in ('betting', 'flying', 'crashed') then
    update public.crash_live_state
    set phase = 'betting',
        betting_ends_at = now() + interval '5 seconds',
        flying_started_at = null,
        crashed_at = null,
        updated_at = now()
    where id = 1;
  end if;
end;
$$;

-- =============================================================================
-- État public (crash_point masqué sauf phase crashed)
-- =============================================================================

create or replace function public.crash_get_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.crash_live_state%rowtype;
begin
  perform public.crash_repair_live_state();
  select * into s from public.crash_live_state where id = 1;
  if not found then
    insert into public.crash_live_state (id, betting_ends_at, crash_point)
    values (1, now() + interval '5 seconds', public.crash_random_point());
    select * into s from public.crash_live_state where id = 1;
  end if;

  return jsonb_build_object(
    'round_id', s.round_id,
    'round_number', s.round_number,
    'phase', s.phase,
    'betting_ends_at', s.betting_ends_at,
    'flying_started_at', s.flying_started_at,
    'crashed_at', s.crashed_at,
    'crash_point', case when s.phase = 'crashed' then s.crash_point else null end
  );
end;
$$;

-- =============================================================================
-- Boucle de jeu (appelée par tous les clients ~4×/s, idempotente)
-- =============================================================================

create or replace function public.crash_advance_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.crash_live_state%rowtype;
  mult numeric;
  next_point numeric;
begin
  perform public.crash_repair_live_state();

  select * into s from public.crash_live_state where id = 1 for update;
  if not found then
    insert into public.crash_live_state (id, betting_ends_at, crash_point)
    values (1, now() + interval '5 seconds', public.crash_random_point());
    return public.crash_get_state();
  end if;

  if s.phase = 'betting' and s.betting_ends_at is not null and now() >= s.betting_ends_at then
    update public.crash_live_state
    set phase = 'flying',
        flying_started_at = now(),
        updated_at = now()
    where id = 1;

  elsif s.phase = 'flying' and s.flying_started_at is not null then
    mult := public.crash_current_multiplier(s.flying_started_at);
    if mult >= s.crash_point then
      update public.crash_bets
      set status = 'lost'
      where round_id = s.round_id and status = 'active';

      insert into public.crash_round_history (round_number, crash_point)
      values (s.round_number, s.crash_point);

      update public.crash_live_state
      set phase = 'crashed',
          crashed_at = now(),
          updated_at = now()
      where id = 1;
    end if;

  elsif s.phase = 'crashed'
    and s.crashed_at is not null
    and now() >= s.crashed_at + interval '3 seconds'
  then
    next_point := public.crash_random_point();
    update public.crash_live_state
    set round_id = gen_random_uuid(),
        round_number = s.round_number + 1,
        phase = 'betting',
        crash_point = next_point,
        betting_ends_at = now() + interval '5 seconds',
        flying_started_at = null,
        crashed_at = null,
        updated_at = now()
    where id = 1;
  end if;

  return public.crash_get_state();
end;
$$;

-- =============================================================================
-- Mise & cashout
-- =============================================================================

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
  if s.phase <> 'betting' or now() >= s.betting_ends_at then
    raise exception 'Les mises sont fermées';
  end if;

  if p_amount <= 0 then
    raise exception 'Mise invalide';
  end if;

  select coalesce(username, 'Joueur'), balance
  into uname, bal
  from public.profiles
  where id = uid
  for update;

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
  set balance = balance - p_amount
  where id = uid;

  insert into public.crash_bets (round_id, user_id, username, bet_amount)
  values (s.round_id, uid, uname, p_amount);

  return jsonb_build_object('ok', true, 'balance', bal - p_amount);
end;
$$;

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
  set balance = balance + payout
  where id = uid
  returning balance into new_bal;

  return jsonb_build_object(
    'ok', true,
    'multiplier', final_mult,
    'payout', payout,
    'balance', new_bal
  );
end;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.crash_live_state enable row level security;
alter table public.crash_bets enable row level security;
alter table public.crash_round_history enable row level security;

drop policy if exists "Crash state: lecture" on public.crash_live_state;
create policy "Crash state: lecture"
  on public.crash_live_state for select to anon, authenticated using (true);

drop policy if exists "Crash bets: lecture" on public.crash_bets;
create policy "Crash bets: lecture"
  on public.crash_bets for select to anon, authenticated using (true);

drop policy if exists "Crash history: lecture" on public.crash_round_history;
create policy "Crash history: lecture"
  on public.crash_round_history for select to anon, authenticated using (true);

grant execute on function public.crash_repair_live_state() to anon, authenticated;
grant execute on function public.crash_get_state() to anon, authenticated;
grant execute on function public.crash_advance_tick() to anon, authenticated;
grant execute on function public.crash_place_bet(bigint) to authenticated;
grant execute on function public.crash_cashout(numeric) to authenticated;
