-- =============================================================================
-- MonCasin — Arène du Jackpot (PvP temps réel)
-- Tables : jackpot_rounds, jackpot_bets
-- Realtime : activer la réplication sur ces deux tables
-- =============================================================================

create table if not exists public.jackpot_meta (
  id int primary key default 1 check (id = 1),
  tax_pool bigint not null default 0 check (tax_pool >= 0),
  updated_at timestamptz not null default now()
);

insert into public.jackpot_meta (id) values (1) on conflict (id) do nothing;

create table if not exists public.jackpot_rounds (
  id uuid primary key default gen_random_uuid(),
  round_number bigint not null default 1,
  status text not null default 'waiting'
    check (status in ('waiting', 'counting', 'rolling', 'ended')),
  total_pot bigint not null default 0 check (total_pot >= 0),
  tax_pool bigint not null default 0 check (tax_pool >= 0),
  winner_id uuid references auth.users (id) on delete set null,
  winner_payout bigint,
  winning_ticket bigint,
  counting_ends_at timestamptz,
  rolling_started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jackpot_rounds_status_idx on public.jackpot_rounds (status, created_at desc);

create table if not exists public.jackpot_bets (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.jackpot_rounds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  username text not null default 'Joueur',
  bet_amount bigint not null check (bet_amount > 0),
  ticket_start bigint not null check (ticket_start >= 0),
  ticket_end bigint not null check (ticket_end >= ticket_start),
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

create index if not exists jackpot_bets_round_id_idx on public.jackpot_bets (round_id);

-- Manche active initiale
insert into public.jackpot_rounds (status, total_pot)
select 'waiting', 0
where not exists (
  select 1 from public.jackpot_rounds
  where status in ('waiting', 'counting', 'rolling', 'ended')
    and (status <> 'ended' or ended_at > now() - interval '10 seconds')
);

-- =============================================================================
-- Helpers
-- =============================================================================

create or replace function public.jackpot_active_round_id()
returns uuid
language sql
stable
as $$
  select id
  from public.jackpot_rounds
  where status in ('waiting', 'counting', 'rolling')
     or (status = 'ended' and ended_at > now() - interval '8 seconds')
  order by created_at desc
  limit 1;
$$;

create or replace function public.jackpot_next_ticket_start(p_round_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(max(ticket_end) + 1, 0)
  from public.jackpot_bets
  where round_id = p_round_id;
$$;

create or replace function public.jackpot_total_tickets(p_round_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(max(ticket_end) + 1, 0)
  from public.jackpot_bets
  where round_id = p_round_id;
$$;

create or replace function public.jackpot_pick_winner(p_round_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_max bigint;
  v_ticket bigint;
  v_winner uuid;
begin
  v_max := public.jackpot_total_tickets(p_round_id);
  if v_max <= 0 then
    return null;
  end if;

  v_ticket := floor(random() * v_max)::bigint;

  select user_id into v_winner
  from public.jackpot_bets
  where round_id = p_round_id
    and ticket_start <= v_ticket
    and ticket_end >= v_ticket
  limit 1;

  update public.jackpot_rounds
  set winning_ticket = v_ticket
  where id = p_round_id;

  return v_winner;
end;
$$;

-- =============================================================================
-- RPC : mise
-- =============================================================================

create or replace function public.jackpot_place_bet(p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile record;
  v_round public.jackpot_rounds%rowtype;
  v_start bigint;
  v_end bigint;
  v_bet_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'Non authentifié');
  end if;

  if p_amount is null or p_amount < 10 then
    return jsonb_build_object('ok', false, 'error', 'Mise minimum : 10 jetons');
  end if;

  select * into v_round
  from public.jackpot_rounds
  where id = public.jackpot_active_round_id()
  for update;

  if not found then
    insert into public.jackpot_rounds (status) values ('waiting')
    returning * into v_round;
  end if;

  if v_round.status not in ('waiting', 'counting') then
    return jsonb_build_object('ok', false, 'error', 'Les mises sont fermées');
  end if;

  if exists (
    select 1 from public.jackpot_bets
    where round_id = v_round.id and user_id = v_user
  ) then
    return jsonb_build_object('ok', false, 'error', 'Tu as déjà misé cette manche');
  end if;

  select username, balance into v_profile
  from public.profiles
  where id = v_user
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Profil introuvable');
  end if;

  if v_profile.balance < p_amount then
    return jsonb_build_object('ok', false, 'error', 'Solde insuffisant');
  end if;

  update public.profiles
  set balance = balance - p_amount
  where id = v_user;

  v_start := public.jackpot_next_ticket_start(v_round.id);
  v_end := v_start + p_amount - 1;

  insert into public.jackpot_bets (
    round_id, user_id, username, bet_amount, ticket_start, ticket_end
  ) values (
    v_round.id, v_user, coalesce(v_profile.username, 'Joueur'),
    p_amount, v_start, v_end
  )
  returning id into v_bet_id;

  update public.jackpot_rounds
  set total_pot = total_pot + p_amount,
      updated_at = now()
  where id = v_round.id
  returning * into v_round;

  if v_round.status = 'waiting' and (
    select count(distinct user_id) from public.jackpot_bets where round_id = v_round.id
  ) >= 2 then
    update public.jackpot_rounds
    set status = 'counting',
        counting_ends_at = now() + interval '30 seconds',
        updated_at = now()
    where id = v_round.id
    returning * into v_round;
  end if;

  return jsonb_build_object(
    'ok', true,
    'bet_id', v_bet_id,
    'balance', (select balance from public.profiles where id = v_user),
    'round', row_to_json(v_round)
  );
end;
$$;

-- =============================================================================
-- RPC : avancement de manche
-- =============================================================================

create or replace function public.jackpot_advance_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.jackpot_rounds%rowtype;
  v_players int;
  v_winner uuid;
  v_tax bigint;
  v_payout bigint;
  v_new_round uuid;
begin
  select * into v_round
  from public.jackpot_rounds
  where id = public.jackpot_active_round_id()
  for update;

  if not found then
    insert into public.jackpot_rounds (status) values ('waiting')
    returning * into v_round;
    return jsonb_build_object('round', row_to_json(v_round));
  end if;

  select count(distinct user_id)::int into v_players
  from public.jackpot_bets
  where round_id = v_round.id;

  if v_round.status = 'waiting' and v_players >= 2 then
    update public.jackpot_rounds
    set status = 'counting',
        counting_ends_at = coalesce(counting_ends_at, now() + interval '30 seconds'),
        updated_at = now()
    where id = v_round.id
    returning * into v_round;
  end if;

  if v_round.status = 'counting'
     and v_round.counting_ends_at is not null
     and now() >= v_round.counting_ends_at
     and v_players >= 2
     and v_round.total_pot > 0 then
    v_winner := public.jackpot_pick_winner(v_round.id);

    update public.jackpot_rounds
    set status = 'rolling',
        winner_id = v_winner,
        rolling_started_at = now(),
        updated_at = now()
    where id = v_round.id
    returning * into v_round;
  end if;

  if v_round.status = 'rolling'
     and v_round.rolling_started_at is not null
     and now() >= v_round.rolling_started_at + interval '4 seconds' then
    v_tax := floor(v_round.total_pot * 0.02);
    v_payout := v_round.total_pot - v_tax;

    if v_round.winner_id is not null and v_payout > 0 then
      update public.profiles
      set balance = balance + v_payout
      where id = v_round.winner_id;
    end if;

    update public.jackpot_meta
    set tax_pool = tax_pool + v_tax,
        updated_at = now()
    where id = 1;

    update public.jackpot_rounds
    set status = 'ended',
        tax_pool = v_tax,
        winner_payout = v_payout,
        ended_at = now(),
        updated_at = now()
    where id = v_round.id
    returning * into v_round;
  end if;

  if v_round.status = 'ended'
     and v_round.ended_at is not null
     and now() >= v_round.ended_at + interval '5 seconds' then
    insert into public.jackpot_rounds (status, round_number)
    values (
      'waiting',
      coalesce((select max(round_number) from public.jackpot_rounds), 0) + 1
    )
    returning id into v_new_round;

    select * into v_round from public.jackpot_rounds where id = v_new_round;
  end if;

  return jsonb_build_object(
    'round', row_to_json(v_round),
    'server_now', now()
  );
end;
$$;

grant execute on function public.jackpot_place_bet(bigint) to authenticated;
grant execute on function public.jackpot_advance_tick() to anon, authenticated;

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.jackpot_rounds enable row level security;
alter table public.jackpot_bets enable row level security;
alter table public.jackpot_meta enable row level security;

drop policy if exists jackpot_rounds_select on public.jackpot_rounds;
create policy jackpot_rounds_select on public.jackpot_rounds
  for select using (true);

drop policy if exists jackpot_bets_select on public.jackpot_bets;
create policy jackpot_bets_select on public.jackpot_bets
  for select using (true);

drop policy if exists jackpot_meta_select on public.jackpot_meta;
create policy jackpot_meta_select on public.jackpot_meta
  for select using (true);
