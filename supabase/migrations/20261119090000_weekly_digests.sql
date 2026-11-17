-- « La semaine de l'équipe » : résumé en 5 lignes rédigé par l'IA, une fois par semaine et par équipe.
-- Gardé ici pour ne pas relancer l'IA à chaque ouverture (quota gratuit d'Echo) et le retrouver sur tous les appareils.
-- Réservé au manager de l'équipe.
create table public.weekly_digests (
  team_id uuid not null references public.teams (id) on delete cascade,
  week_start date not null,
  content jsonb not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (team_id, week_start)
);

alter table public.weekly_digests enable row level security;

create policy "résumé hebdo lu par le manager" on public.weekly_digests
  for select to authenticated using (team_id = public.auth_team_id() and public.auth_is_manager());
create policy "résumé hebdo écrit par le manager" on public.weekly_digests
  for insert to authenticated with check (team_id = public.auth_team_id() and public.auth_is_manager());
create policy "résumé hebdo actualisé par le manager" on public.weekly_digests
  for update to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());

grant select, insert, update on public.weekly_digests to authenticated;
