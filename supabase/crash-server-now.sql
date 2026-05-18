-- Horloge serveur Postgres pour la boucle Crash (évite le drift Vercel ↔ Supabase)
-- Exécuter dans Supabase → SQL Editor

create or replace function public.crash_server_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select clock_timestamp();
$$;

grant execute on function public.crash_server_now() to anon, authenticated, service_role;

notify pgrst, 'reload schema';
