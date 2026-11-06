-- Cadence — objectifs (OKR), compétences, feedback, météo.

create type public.objective_scope as enum ('equipe', 'individuel');
create type public.feedback_kind as enum ('point_fort', 'axe_progres', 'reconnaissance');

-- ─── Objectifs et résultats clés ────────────────────────────────────────

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  scope public.objective_scope not null,
  owner_id uuid references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  start_date date not null,
  due_date date not null,
  archived boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date >= start_date),
  check ((scope = 'equipe' and owner_id is null) or (scope = 'individuel' and owner_id is not null))
);
create index objectives_team_idx on public.objectives (team_id);
create index objectives_owner_idx on public.objectives (owner_id);
create trigger objectives_updated_at before update on public.objectives
  for each row execute function public.set_updated_at();

create table public.key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.objectives (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  unit text not null default '%' check (char_length(unit) <= 20),
  start_value numeric not null default 0,
  target_value numeric not null,
  current_value numeric not null default 0,
  pending_value numeric,
  pending_at timestamptz,
  validated_at timestamptz,
  position smallint not null default 0,
  updated_at timestamptz not null default now(),
  check (target_value <> start_value)
);
create index key_results_objective_idx on public.key_results (objective_id);
create trigger key_results_updated_at before update on public.key_results
  for each row execute function public.set_updated_at();

create table public.key_result_history (
  id bigint generated always as identity primary key,
  key_result_id uuid not null references public.key_results (id) on delete cascade,
  value numeric not null,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id)
);
create index key_result_history_kr_idx on public.key_result_history (key_result_id, recorded_at);

alter table public.objectives enable row level security;
alter table public.key_results enable row level security;
alter table public.key_result_history enable row level security;

create policy "objectifs visibles" on public.objectives
  for select to authenticated using (
    team_id = public.auth_team_id()
    and (public.auth_is_manager() or scope = 'equipe' or owner_id = auth.uid())
  );
create policy "objectifs gérés par le manager" on public.objectives
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager()
              and (owner_id is null or public.auth_manages(owner_id)));

-- Les sous-requêtes sur objectives sont elles-mêmes filtrées par sa RLS.
create policy "résultats clés visibles" on public.key_results
  for select to authenticated using (exists (select 1 from public.objectives o where o.id = objective_id));
create policy "résultats clés gérés par le manager" on public.key_results
  for all to authenticated
  using (public.auth_is_manager() and exists (select 1 from public.objectives o where o.id = objective_id))
  with check (public.auth_is_manager() and exists (select 1 from public.objectives o where o.id = objective_id));

create policy "historique visible" on public.key_result_history
  for select to authenticated using (exists (select 1 from public.key_results k where k.id = key_result_id));

-- Le collaborateur propose une nouvelle valeur ; le manager l'applique directement.
create function public.propose_key_result_value(p_key_result_id uuid, p_value numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_scope public.objective_scope;
begin
  select o.owner_id, o.scope into v_owner, v_scope
  from public.key_results k join public.objectives o on o.id = k.objective_id
  where k.id = p_key_result_id and o.team_id = public.auth_team_id() and not o.archived;

  if not found then
    raise exception 'Résultat clé introuvable.' using errcode = '42501';
  end if;

  if public.auth_is_manager() then
    update public.key_results
      set current_value = p_value, pending_value = null, pending_at = null, validated_at = now()
      where id = p_key_result_id;
    insert into public.key_result_history (key_result_id, value, recorded_by) values (p_key_result_id, p_value, auth.uid());
  elsif v_scope = 'individuel' and v_owner = auth.uid() then
    update public.key_results set pending_value = p_value, pending_at = now() where id = p_key_result_id;
  else
    raise exception 'Seul le responsable de l''objectif peut mettre à jour cet avancement.' using errcode = '42501';
  end if;
end $$;

-- Le manager valide (ou refuse) la valeur proposée par le collaborateur.
create function public.review_key_result_value(p_key_result_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pending numeric;
begin
  if not public.auth_is_manager() then
    raise exception 'Seul le manager peut valider un avancement.' using errcode = '42501';
  end if;
  select k.pending_value into v_pending
  from public.key_results k join public.objectives o on o.id = k.objective_id
  where k.id = p_key_result_id and o.team_id = public.auth_team_id();
  if v_pending is null then
    raise exception 'Aucune mise à jour en attente pour ce résultat clé.';
  end if;
  if p_accept then
    update public.key_results
      set current_value = v_pending, pending_value = null, pending_at = null, validated_at = now()
      where id = p_key_result_id;
    insert into public.key_result_history (key_result_id, value, recorded_by) values (p_key_result_id, v_pending, auth.uid());
  else
    update public.key_results set pending_value = null, pending_at = null where id = p_key_result_id;
  end if;
end $$;

-- ─── Compétences ────────────────────────────────────────────────────────

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (char_length(category) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table public.skill_levels (
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  self_level smallint check (self_level between 1 and 4),
  manager_level smallint check (manager_level between 1 and 4),
  validated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (collaborator_id, skill_id)
);
create trigger skill_levels_updated_at before update on public.skill_levels
  for each row execute function public.set_updated_at();

alter table public.skills enable row level security;
alter table public.skill_levels enable row level security;

create policy "compétences visibles par l'équipe" on public.skills
  for select to authenticated using (team_id = public.auth_team_id());
create policy "compétences gérées par le manager" on public.skills
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());

create policy "niveaux visibles" on public.skill_levels
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "niveaux gérés par le manager" on public.skill_levels
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id));

-- Auto-évaluation : le collaborateur ne touche qu'à self_level ; la validation est remise à zéro.
create function public.set_self_skill_level(p_skill_id uuid, p_level smallint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.auth_team_id() is null
     or not exists (select 1 from public.skills where id = p_skill_id and team_id = public.auth_team_id()) then
    raise exception 'Compétence introuvable.' using errcode = '42501';
  end if;
  if p_level is not null and (p_level < 1 or p_level > 4) then
    raise exception 'Le niveau doit être compris entre 1 et 4.' using errcode = '23514';
  end if;
  insert into public.skill_levels (collaborator_id, skill_id, self_level)
  values (auth.uid(), p_skill_id, p_level)
  on conflict (collaborator_id, skill_id)
  do update set self_level = excluded.self_level, validated_at = null;
end $$;

-- ─── Feedback continu ───────────────────────────────────────────────────

create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  kind public.feedback_kind not null,
  body text not null check (char_length(body) between 3 and 2000),
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);
create index feedbacks_collaborator_idx on public.feedbacks (collaborator_id, created_at desc);

alter table public.feedbacks enable row level security;
create policy "feedbacks : manager" on public.feedbacks
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and team_id = public.auth_team_id());
create policy "feedbacks partagés visibles par le collaborateur" on public.feedbacks
  for select to authenticated using (public.auth_is_self(collaborator_id) and is_shared);

-- ─── Météo hebdomadaire ─────────────────────────────────────────────────

create table public.weather_entries (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  mood smallint not null check (mood between 1 and 5),
  workload smallint not null check (workload between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (collaborator_id, week_start)
);

alter table public.weather_entries enable row level security;
create policy "météo visible" on public.weather_entries
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "météo saisie par le collaborateur" on public.weather_entries
  for insert to authenticated with check (public.auth_is_self(collaborator_id));
create policy "météo modifiée par le collaborateur" on public.weather_entries
  for update to authenticated
  using (public.auth_is_self(collaborator_id))
  with check (public.auth_is_self(collaborator_id));

revoke all on all tables in schema public from anon;
