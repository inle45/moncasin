-- =============================================================================
-- Corrige crash_advance_tick si la transition betting → flying ne se fait pas
-- (comparaison timestamptz, relecture après UPDATE)
-- Exécuter dans Supabase → SQL Editor puis : NOTIFY pgrst, 'reload schema';
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

  if s.phase = 'betting'
    and s.betting_ends_at is not null
    and clock_timestamp() >= s.betting_ends_at::timestamptz
  then
    update public.crash_live_state
    set phase = 'flying',
        flying_started_at = clock_timestamp(),
        updated_at = clock_timestamp()
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
          crashed_at = clock_timestamp(),
          updated_at = clock_timestamp()
      where id = 1;
    end if;

  elsif s.phase = 'crashed'
    and s.crashed_at is not null
    and clock_timestamp() >= s.crashed_at + interval '3 seconds'
  then
    next_point := public.crash_random_point();
    update public.crash_live_state
    set round_id = gen_random_uuid(),
        round_number = s.round_number + 1,
        phase = 'betting',
        crash_point = next_point,
        betting_ends_at = clock_timestamp() + interval '5 seconds',
        flying_started_at = null,
        crashed_at = null,
        updated_at = clock_timestamp()
    where id = 1;
  end if;

  return public.crash_get_state();
end;
$$;

grant execute on function public.crash_advance_tick() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
