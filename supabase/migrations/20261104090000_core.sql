-- Cadence — socle : équipes, profils, fonctions d'aide RLS, journal des connexions, paramètres.

create type public.app_role as enum ('manager', 'collaborateur');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  company text not null check (char_length(company) between 2 and 120),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  team_id uuid not null references public.teams (id),
  role public.app_role not null default 'collaborateur',
  first_name text not null check (char_length(first_name) between 1 and 60),
  last_name text not null check (char_length(last_name) between 1 and 60),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  job_title text not null check (char_length(job_title) between 2 and 80),
  hired_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_team_idx on public.profiles (team_id);

-- Mise à jour automatique de updated_at.
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── Fonctions d'aide RLS ────────────────────────────────────────────────
-- security definer : lisent profiles sans repasser par sa propre RLS (évite la récursion).
-- Un profil désactivé n'a plus aucun droit : toutes renvoient null / false.

create function public.auth_team_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select team_id from public.profiles where id = auth.uid() and is_active
$$;

create function public.auth_is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_active and role = 'manager'
  )
$$;

-- Vrai si l'utilisateur connecté est le manager actif de l'équipe de `target`.
create function public.auth_manages(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.profiles me
    join public.profiles p on p.team_id = me.team_id
    where me.id = auth.uid() and me.is_active and me.role = 'manager' and p.id = target
  )
$$;

-- Vrai si `target` est l'utilisateur connecté (et que son compte est actif).
create function public.auth_is_self(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select target = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_active)
$$;

-- Garde de colonnes : un non-manager ne peut modifier que les colonnes listées en argument.
-- (La RLS filtre les lignes, pas les colonnes.)
create function public.guard_columns() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or public.auth_is_manager() then
    return new;
  end if;
  if (to_jsonb(new) - tg_argv::text[]) is distinct from (to_jsonb(old) - tg_argv::text[]) then
    raise exception 'Vous ne pouvez modifier que le statut de cet élément.' using errcode = '42501';
  end if;
  return new;
end $$;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;

create policy "équipe visible par ses membres" on public.teams
  for select to authenticated using (id = public.auth_team_id());

create policy "manager modifie son équipe" on public.teams
  for update to authenticated using (id = public.auth_team_id() and public.auth_is_manager());

-- Collaborateur : sa fiche et celle de son manager ; manager : toute l'équipe.
create policy "profils visibles" on public.profiles
  for select to authenticated using (
    public.auth_is_self(id)
    or public.auth_manages(id)
    or (team_id = public.auth_team_id() and role = 'manager')
  );

-- La création de compte passe par l'Edge Function invite-member (service_role).
create policy "manager modifie les fiches de son équipe" on public.profiles
  for update to authenticated
  using (public.auth_manages(id))
  with check (team_id = public.auth_team_id());

-- ─── Notes privées du manager (jamais visibles du collaborateur) ─────────

create table public.manager_notes (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index manager_notes_collaborator_idx on public.manager_notes (collaborator_id);
create trigger manager_notes_updated_at before update on public.manager_notes
  for each row execute function public.set_updated_at();

alter table public.manager_notes enable row level security;
create policy "notes privées : manager uniquement" on public.manager_notes
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and author_id = auth.uid());

-- ─── Journal des connexions ─────────────────────────────────────────────

create table public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create index login_events_team_idx on public.login_events (team_id, created_at desc);

alter table public.login_events enable row level security;
create policy "journal lisible par le manager" on public.login_events
  for select to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager());

-- Appelée par le client juste après une connexion réussie.
create function public.record_login(p_user_agent text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_team uuid := public.auth_team_id();
begin
  if v_team is null then
    raise exception 'Compte inactif ou inconnu.' using errcode = '42501';
  end if;
  insert into public.login_events (user_id, team_id, user_agent)
  values (auth.uid(), v_team, left(p_user_agent, 400));
end $$;

-- ─── Paramètres d'équipe (seuils d'alerte) ──────────────────────────────

create table public.team_settings (
  team_id uuid primary key references public.teams (id) on delete cascade,
  no_one_to_one_days smallint not null default 30 check (no_one_to_one_days between 7 and 120),
  overload_pct smallint not null default 100 check (overload_pct between 80 and 150),
  underload_pct smallint not null default 60 check (underload_pct between 20 and 90),
  overload_weeks smallint not null default 2 check (overload_weeks between 1 and 6),
  weather_drop_weeks smallint not null default 3 check (weather_drop_weeks between 2 and 8),
  review_due_days smallint not null default 30 check (review_due_days between 7 and 90),
  prep_reminder_days smallint not null default 3 check (prep_reminder_days between 1 and 14),
  max_absent smallint not null default 2 check (max_absent between 1 and 20),
  updated_at timestamptz not null default now()
);
create trigger team_settings_updated_at before update on public.team_settings
  for each row execute function public.set_updated_at();

alter table public.team_settings enable row level security;
create policy "paramètres lisibles par l'équipe" on public.team_settings
  for select to authenticated using (team_id = public.auth_team_id());
create policy "paramètres modifiables par le manager" on public.team_settings
  for update to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id());

-- Aucun accès anonyme aux données métier.
revoke all on all tables in schema public from anon;
