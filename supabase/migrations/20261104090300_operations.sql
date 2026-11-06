-- Cadence — projets, tâches, plan de charge, absences, réunions, délégation.

create type public.task_status as enum ('a_faire', 'en_cours', 'en_validation', 'termine');
create type public.task_priority as enum ('basse', 'normale', 'haute', 'urgente');
create type public.absence_kind as enum ('conges_payes', 'rtt', 'maladie', 'formation', 'sans_solde');
create type public.delegation_level as enum ('decide', 'propose', 'execute');

-- ─── Projets et tâches ──────────────────────────────────────────────────

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  code text not null check (char_length(code) between 2 and 20),
  name text not null check (char_length(name) between 2 and 120),
  client text not null default '' check (char_length(client) <= 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, code)
);

alter table public.projects enable row level security;
create policy "projets visibles par l'équipe" on public.projects
  for select to authenticated using (team_id = public.auth_team_id());
create policy "projets gérés par le manager" on public.projects
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  project_id uuid references public.projects (id) on delete set null,
  title text not null check (char_length(title) between 3 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  assignee_id uuid references public.profiles (id) on delete set null,
  priority public.task_priority not null default 'normale',
  status public.task_status not null default 'a_faire',
  due_date date,
  position double precision not null default 0,
  created_by uuid default auth.uid() references public.profiles (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_team_idx on public.tasks (team_id, status);
create index tasks_assignee_idx on public.tasks (assignee_id);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger tasks_guard before update on public.tasks
  for each row execute function public.guard_columns('status', 'position', 'completed_at', 'updated_at');

create function public.stamp_task_completion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'termine' and (tg_op = 'INSERT' or old.status <> 'termine') then
    new.completed_at := now();
  elsif new.status <> 'termine' then
    new.completed_at := null;
  end if;
  return new;
end $$;
create trigger tasks_completion before insert or update of status on public.tasks
  for each row execute function public.stamp_task_completion();

alter table public.tasks enable row level security;
create policy "tâches visibles" on public.tasks
  for select to authenticated using (
    team_id = public.auth_team_id() and (public.auth_is_manager() or assignee_id = auth.uid())
  );
create policy "tâches gérées par le manager" on public.tasks
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager()
              and (assignee_id is null or public.auth_manages(assignee_id)));
create policy "le collaborateur fait avancer ses tâches" on public.tasks
  for update to authenticated
  using (public.auth_is_self(assignee_id))
  with check (public.auth_is_self(assignee_id));

-- ─── Plan de charge ─────────────────────────────────────────────────────

create table public.workload_allocations (
  id uuid primary key default gen_random_uuid(),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  percent smallint not null check (percent between 0 and 200),
  unique (collaborator_id, project_id, week_start)
);
create index workload_week_idx on public.workload_allocations (week_start);

alter table public.workload_allocations enable row level security;
create policy "charge visible" on public.workload_allocations
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "charge gérée par le manager" on public.workload_allocations
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id));

-- ─── Absences ───────────────────────────────────────────────────────────

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind public.absence_kind not null,
  start_date date not null,
  end_date date not null,
  status public.request_status not null default 'en_attente',
  comment text not null default '' check (char_length(comment) <= 500),
  decision_comment text not null default '' check (char_length(decision_comment) <= 500),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  check (end_date - start_date <= 90)
);
create index absences_team_idx on public.absences (team_id, start_date);

alter table public.absences enable row level security;
create policy "absences visibles" on public.absences
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "demande d'absence" on public.absences
  for insert to authenticated
  with check (team_id = public.auth_team_id() and (
    (public.auth_is_self(collaborator_id) and status = 'en_attente' and decided_by is null)
    or public.auth_manages(collaborator_id)
  ));
create policy "absence traitée par le manager" on public.absences
  for update to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id));
create policy "annulation d'une demande en attente" on public.absences
  for delete to authenticated
  using ((public.auth_is_self(collaborator_id) and status = 'en_attente') or public.auth_manages(collaborator_id));

-- ─── Réunions, décisions, actions ───────────────────────────────────────

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  title text not null check (char_length(title) between 3 and 160),
  held_on date not null,
  participants uuid[] not null default '{}',
  notes text not null default '' check (char_length(notes) <= 20000),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger meetings_updated_at before update on public.meetings
  for each row execute function public.set_updated_at();

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  details text not null default '' check (char_length(details) <= 2000),
  created_at timestamptz not null default now()
);
create index decisions_meeting_idx on public.decisions (meeting_id);

create table public.meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  due_date date,
  status public.action_status not null default 'a_faire',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meeting_actions_meeting_idx on public.meeting_actions (meeting_id);
create index meeting_actions_owner_idx on public.meeting_actions (owner_id);
create trigger meeting_actions_updated_at before update on public.meeting_actions
  for each row execute function public.set_updated_at();
create trigger meeting_actions_guard before update on public.meeting_actions
  for each row execute function public.guard_columns('status', 'done_at', 'updated_at');

alter table public.meetings enable row level security;
alter table public.decisions enable row level security;
alter table public.meeting_actions enable row level security;

create policy "réunions : manager" on public.meetings
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());
create policy "décisions : manager" on public.decisions
  for all to authenticated
  using (public.auth_is_manager() and exists (select 1 from public.meetings m where m.id = meeting_id))
  with check (public.auth_is_manager() and exists (select 1 from public.meetings m where m.id = meeting_id));
create policy "actions de réunion : manager" on public.meeting_actions
  for all to authenticated
  using (public.auth_is_manager() and exists (select 1 from public.meetings m where m.id = meeting_id))
  with check (public.auth_is_manager() and exists (select 1 from public.meetings m where m.id = meeting_id));
create policy "actions de réunion : responsable" on public.meeting_actions
  for select to authenticated using (public.auth_is_self(owner_id));
create policy "le responsable fait avancer son action de réunion" on public.meeting_actions
  for update to authenticated
  using (public.auth_is_self(owner_id))
  with check (public.auth_is_self(owner_id));

-- ─── Matrice de délégation ──────────────────────────────────────────────

create table public.delegation_domains (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '' check (char_length(description) <= 300),
  position smallint not null default 0,
  unique (team_id, name)
);

create table public.delegations (
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  domain_id uuid not null references public.delegation_domains (id) on delete cascade,
  level public.delegation_level not null,
  updated_at timestamptz not null default now(),
  primary key (collaborator_id, domain_id)
);
create trigger delegations_updated_at before update on public.delegations
  for each row execute function public.set_updated_at();

alter table public.delegation_domains enable row level security;
alter table public.delegations enable row level security;
create policy "domaines visibles par l'équipe" on public.delegation_domains
  for select to authenticated using (team_id = public.auth_team_id());
create policy "domaines gérés par le manager" on public.delegation_domains
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());
create policy "délégations visibles" on public.delegations
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "délégations gérées par le manager" on public.delegations
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id));

revoke all on all tables in schema public from anon;
