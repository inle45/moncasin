-- =============================================================================
-- MonCasin — RLS pour mises Crash sans RPC
-- Exécuter dans Supabase → SQL Editor après apply-crash-bet-rpc.sql (ou seul)
-- =============================================================================

alter table public.crash_bets enable row level security;

drop policy if exists "Crash bets: lecture" on public.crash_bets;
create policy "Crash bets: lecture"
  on public.crash_bets
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Crash bets: insert own" on public.crash_bets;
create policy "Crash bets: insert own"
  on public.crash_bets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Crash bets: update own" on public.crash_bets;
create policy "Crash bets: update own"
  on public.crash_bets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
