-- Avatar + cadre profil (compétitif / VIP)
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists profile_frame text;

comment on column public.profiles.avatar_url is 'URL publique de la photo de profil';
comment on column public.profiles.profile_frame is 'Cadre visuel (ex: vip, gold)';
