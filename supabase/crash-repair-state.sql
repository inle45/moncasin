-- =============================================================================
-- MonCasin — Réparation état Crash (NULL sur betting_ends_at, etc.)
-- Exécuter dans Supabase → SQL Editor si le compte à rebours affiche NaN
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

-- Réparer la ligne existante tout de suite
select public.crash_repair_live_state();

-- Réinjecter repair dans get_state / advance_tick
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

grant execute on function public.crash_repair_live_state() to anon, authenticated;

-- =============================================================================
-- Optionnel : pg_cron (extension activée sur Supabase Pro)
-- Database → Extensions → pg_cron → Enable, puis :
-- =============================================================================
-- select cron.schedule(
--   'moncasin-crash-tick',
--   '1 second',
--   $$ select public.crash_advance_tick(); $$
-- );
