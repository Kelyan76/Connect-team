-- Cadence — pouls du jour : chaque collaborateur indique en quelques secondes son humeur
-- et sa motivation du jour (1 à 5), avec un mot facultatif. Le manager suit l'équipe au jour le jour.

-- Jour courant à l'heure de Paris (la base tourne en UTC).
create function public.paris_today() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Europe/Paris')::date $$;
grant execute on function public.paris_today() to authenticated, service_role;

create table public.daily_pulses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id) on delete cascade,
  collaborator_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day date not null default public.paris_today(),
  mood smallint not null check (mood between 1 and 5),
  energy smallint not null check (energy between 1 and 5),
  note text not null default '' check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collaborator_id, day)
);
create index daily_pulses_team_day_idx on public.daily_pulses (team_id, day desc);

create trigger daily_pulses_updated_at before update on public.daily_pulses
  for each row execute function public.set_updated_at();

alter table public.daily_pulses enable row level security;
create policy "pouls visible par soi et son manager" on public.daily_pulses
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "pouls saisi par le collaborateur" on public.daily_pulses
  for insert to authenticated
  with check (public.auth_is_self(collaborator_id) and team_id = public.auth_team_id() and day = public.paris_today());
create policy "pouls du jour modifiable par le collaborateur" on public.daily_pulses
  for update to authenticated
  using (public.auth_is_self(collaborator_id) and day = public.paris_today())
  with check (public.auth_is_self(collaborator_id) and team_id = public.auth_team_id() and day = public.paris_today());

revoke all on public.daily_pulses from anon;
grant select, insert, update on public.daily_pulses to authenticated;
grant select, insert, update, delete on public.daily_pulses to service_role;

-- Historique de démonstration : trois semaines de jours ouvrés (sans aujourd'hui, pour que
-- chaque collaborateur de démo ait son pouls du jour à donner). Julien Mercier montre un moral
-- en baisse sur les derniers jours, pour illustrer les signaux d'alerte du manager.
create function public.generate_demo_pulses(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.daily_pulses (team_id, collaborator_id, day, mood, energy, note, created_at, updated_at)
  select
    p_team,
    p.id,
    d.day,
    case
      when p.first_name = 'Julien' and d.day > public.paris_today() - 6 then 1 + abs(hashtext(p.id::text || d.day::text)) % 2
      else greatest(2, 3 + abs(hashtext(p.id::text || d.day::text)) % 3 - (case when abs(hashtext(d.day::text || p.id::text)) % 6 = 0 then 1 else 0 end))
    end,
    case
      when p.first_name = 'Julien' and d.day > public.paris_today() - 6 then 2
      else greatest(2, 3 + abs(hashtext('e' || p.id::text || d.day::text)) % 3 - (case when abs(hashtext('f' || d.day::text)) % 5 = 0 then 1 else 0 end))
    end,
    case
      when p.first_name = 'Julien' and d.day = public.paris_today() - 1 then 'Encore une astreinte cette nuit, je commence à fatiguer.'
      when abs(hashtext('n' || p.id::text || d.day::text)) % 9 = 0 then 'Bonne journée, chantier qui avance bien.'
      else ''
    end,
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris',
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris'
  from public.profiles p
  cross join lateral (select g::date as day from generate_series(public.paris_today() - 21, public.paris_today() - 1, interval '1 day') g) d
  where p.team_id = p_team and p.role = 'collaborateur' and p.is_active
    and extract(isodow from d.day) < 6
    and abs(hashtext('s' || p.id::text || d.day::text)) % 7 <> 0
  on conflict (collaborator_id, day) do nothing;
end $$;

revoke execute on function public.generate_demo_pulses(uuid) from public, anon, authenticated;
grant execute on function public.generate_demo_pulses(uuid) to service_role;

-- Projet déjà installé : l'équipe modèle reçoit aussi un historique.
select public.generate_demo_pulses(t.id) from public.teams t where t.id = '22222222-0000-4000-8000-000000000001';
