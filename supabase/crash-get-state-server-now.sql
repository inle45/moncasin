-- Inclut l'horloge Postgres dans crash_get_state (pour offset UI client)
-- Exécuter dans Supabase → SQL Editor

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
    values (1, clock_timestamp() + interval '5 seconds', public.crash_random_point());
    select * into s from public.crash_live_state where id = 1;
  end if;

  return jsonb_build_object(
    'round_id', s.round_id,
    'round_number', s.round_number,
    'phase', s.phase,
    'betting_ends_at', s.betting_ends_at,
    'flying_started_at', s.flying_started_at,
    'crashed_at', s.crashed_at,
    'crash_point', case when s.phase = 'crashed' then s.crash_point else null end,
    'server_now', clock_timestamp()
  );
end;
$$;

grant execute on function public.crash_get_state() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
