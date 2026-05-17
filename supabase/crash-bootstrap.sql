-- MonCasin — Bootstrap / réparation Crash (Supabase SQL Editor)
-- 1) Exécuter d'abord crash-multiplayer.sql si les tables n'existent pas
-- 2) Puis exécuter ce fichier

select public.crash_repair_live_state();

update public.crash_live_state
set
  phase = 'betting',
  betting_ends_at = now() + interval '5 seconds',
  flying_started_at = null,
  crashed_at = null,
  crash_point = public.crash_random_point(),
  round_id = gen_random_uuid(),
  round_number = round_number + 1,
  updated_at = now()
where id = 1
  and phase = 'betting'
  and betting_ends_at <= now();

select public.crash_advance_tick();
