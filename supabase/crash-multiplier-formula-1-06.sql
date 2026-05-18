-- Aligne crash_current_multiplier sur pow(1.06, t) + round (comme le client)
-- Exécuter dans Supabase → SQL Editor

create or replace function public.crash_current_multiplier(p_started_at timestamptz)
returns numeric
language sql
stable
set search_path = public
as $$
  select round(
    (power(1.06, greatest(0, extract(epoch from (clock_timestamp() - p_started_at))))::numeric)
    * 100
  ) / 100;
$$;

notify pgrst, 'reload schema';
