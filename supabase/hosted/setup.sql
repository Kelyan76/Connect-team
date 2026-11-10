-- Cadence : installation complète sur un projet Supabase vide (migrations puis jeu de démonstration).
-- Généré à partir de supabase/migrations et supabase/seed.sql. À exécuter une seule fois dans SQL Editor.

-- ===== 20261104090000_core.sql =====
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

-- ===== 20261104090100_performance.sql =====
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

-- ===== 20261104090200_reviews.sql =====
-- Cadence — entretiens : trames, planification, préparation en deux temps, compte-rendu signé.

create type public.review_kind as enum ('one_to_one', 'annuel', 'professionnel');
create type public.review_status as enum ('planifie', 'termine', 'annule');
create type public.question_type as enum ('texte', 'echelle', 'choix', 'oui_non');
create type public.answer_author as enum ('manager', 'collaborateur');
create type public.action_status as enum ('a_faire', 'en_cours', 'fait');
create type public.request_status as enum ('en_attente', 'validee', 'refusee');

-- ─── Trames ─────────────────────────────────────────────────────────────

create table public.review_templates (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  kind public.review_kind not null,
  name text not null check (char_length(name) between 3 and 120),
  description text not null default '' check (char_length(description) <= 500),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger review_templates_updated_at before update on public.review_templates
  for each row execute function public.set_updated_at();

create table public.template_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.review_templates (id) on delete cascade,
  position smallint not null default 0,
  section text not null default '' check (char_length(section) <= 80),
  label text not null check (char_length(label) between 3 and 300),
  help text not null default '' check (char_length(help) <= 300),
  type public.question_type not null,
  options jsonb not null default '[]' check (jsonb_typeof(options) = 'array')
);
create index template_questions_template_idx on public.template_questions (template_id, position);

alter table public.review_templates enable row level security;
alter table public.template_questions enable row level security;

create policy "trames visibles par l'équipe" on public.review_templates
  for select to authenticated using (team_id = public.auth_team_id());
create policy "trames gérées par le manager" on public.review_templates
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());

create policy "questions visibles" on public.template_questions
  for select to authenticated using (exists (select 1 from public.review_templates t where t.id = template_id));
create policy "questions gérées par le manager" on public.template_questions
  for all to authenticated
  using (public.auth_is_manager() and exists (select 1 from public.review_templates t where t.id = template_id))
  with check (public.auth_is_manager() and exists (select 1 from public.review_templates t where t.id = template_id));

-- ─── Entretiens ─────────────────────────────────────────────────────────
-- Les questions sont copiées dans l'entretien à sa création (snapshot) :
-- modifier une trame ne change pas l'historique.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  manager_id uuid not null default auth.uid() references public.profiles (id),
  kind public.review_kind not null,
  template_id uuid references public.review_templates (id) on delete set null,
  questions jsonb not null default '[]' check (jsonb_typeof(questions) = 'array'),
  scheduled_at timestamptz not null,
  duration_minutes smallint not null default 60 check (duration_minutes between 15 and 480),
  location text not null default '' check (char_length(location) <= 120),
  status public.review_status not null default 'planifie',
  collaborator_prepared_at timestamptz,
  manager_prepared_at timestamptz,
  live_notes text not null default '' check (char_length(live_notes) <= 20000),
  summary text not null default '' check (char_length(summary) <= 8000),
  completed_at timestamptz,
  collaborator_signed_at timestamptz,
  manager_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_collaborator_idx on public.reviews (collaborator_id, scheduled_at desc);
create index reviews_team_idx on public.reviews (team_id, scheduled_at);
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Un compte-rendu signé par les deux parties est figé.
create function public.lock_signed_review() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.collaborator_signed_at is not null and old.manager_signed_at is not null and auth.uid() is not null then
    raise exception 'Ce compte-rendu est signé par les deux parties et ne peut plus être modifié.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger reviews_lock before update on public.reviews
  for each row execute function public.lock_signed_review();

alter table public.reviews enable row level security;
create policy "entretiens visibles" on public.reviews
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "entretiens gérés par le manager" on public.reviews
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and team_id = public.auth_team_id());

-- ─── Réponses ───────────────────────────────────────────────────────────

create table public.review_answers (
  review_id uuid not null references public.reviews (id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 64),
  author public.answer_author not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (review_id, question_key, author)
);
create trigger review_answers_updated_at before update on public.review_answers
  for each row execute function public.set_updated_at();

-- Règles de visibilité croisée (security definer : lit reviews sans RLS).
-- • Réponses du collaborateur : visibles par lui ; par le manager seulement après validation de sa préparation.
-- • Réponses du manager : visibles par lui ; par le collaborateur quand les deux préparations sont validées.
create function public.can_read_answer(p_review_id uuid, p_author public.answer_author) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reviews r
    where r.id = p_review_id
      and case p_author
        when 'collaborateur' then
          public.auth_is_self(r.collaborator_id)
          or (public.auth_manages(r.collaborator_id) and r.collaborator_prepared_at is not null)
        else
          public.auth_manages(r.collaborator_id)
          or (public.auth_is_self(r.collaborator_id)
              and r.collaborator_prepared_at is not null and r.manager_prepared_at is not null)
      end
  )
$$;

-- Écriture : chacun ses réponses ; le collaborateur jusqu'à la validation de sa préparation,
-- le manager jusqu'à la signature.
create function public.can_write_answer(p_review_id uuid, p_author public.answer_author) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.reviews r
    where r.id = p_review_id and r.status <> 'annule'
      and case p_author
        when 'collaborateur' then
          public.auth_is_self(r.collaborator_id) and r.collaborator_prepared_at is null and r.status = 'planifie'
        else
          public.auth_manages(r.collaborator_id) and r.manager_signed_at is null
      end
  )
$$;

alter table public.review_answers enable row level security;
create policy "réponses visibles" on public.review_answers
  for select to authenticated using (public.can_read_answer(review_id, author));
create policy "réponses saisies" on public.review_answers
  for insert to authenticated with check (public.can_write_answer(review_id, author));
create policy "réponses modifiées" on public.review_answers
  for update to authenticated
  using (public.can_write_answer(review_id, author))
  with check (public.can_write_answer(review_id, author));

-- Validation de sa préparation (collaborateur ou manager selon l'appelant).
create function public.submit_review_preparation(p_review_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r public.reviews%rowtype;
begin
  select * into r from public.reviews where id = p_review_id;
  if not found or r.status <> 'planifie' then
    raise exception 'Entretien introuvable ou déjà clos.' using errcode = '42501';
  end if;
  if public.auth_is_self(r.collaborator_id) then
    update public.reviews set collaborator_prepared_at = coalesce(collaborator_prepared_at, now()) where id = p_review_id;
  elsif public.auth_manages(r.collaborator_id) then
    update public.reviews set manager_prepared_at = coalesce(manager_prepared_at, now()) where id = p_review_id;
  else
    raise exception 'Vous ne participez pas à cet entretien.' using errcode = '42501';
  end if;
end $$;

-- Signature électronique simple : horodatage serveur, partie déduite de l'appelant.
create function public.sign_review(p_review_id uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  r public.reviews%rowtype;
  v_now timestamptz := now();
begin
  select * into r from public.reviews where id = p_review_id;
  if not found or r.status <> 'termine' then
    raise exception 'Le compte-rendu ne peut être signé qu''une fois l''entretien clos.' using errcode = '42501';
  end if;
  if public.auth_is_self(r.collaborator_id) then
    if r.collaborator_signed_at is not null then return r.collaborator_signed_at; end if;
    update public.reviews set collaborator_signed_at = v_now where id = p_review_id;
  elsif public.auth_manages(r.collaborator_id) then
    if r.manager_signed_at is not null then return r.manager_signed_at; end if;
    update public.reviews set manager_signed_at = v_now where id = p_review_id;
  else
    raise exception 'Vous ne participez pas à cet entretien.' using errcode = '42501';
  end if;
  return v_now;
end $$;

-- ─── Plan d'action ──────────────────────────────────────────────────────

create table public.review_actions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 200),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  due_date date,
  status public.action_status not null default 'a_faire',
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index review_actions_review_idx on public.review_actions (review_id);
create index review_actions_owner_idx on public.review_actions (owner_id);
create trigger review_actions_updated_at before update on public.review_actions
  for each row execute function public.set_updated_at();
create trigger review_actions_guard before update on public.review_actions
  for each row execute function public.guard_columns('status', 'done_at', 'updated_at');

alter table public.review_actions enable row level security;
create policy "actions visibles" on public.review_actions
  for select to authenticated using (exists (select 1 from public.reviews r where r.id = review_id));
create policy "actions gérées par le manager" on public.review_actions
  for all to authenticated
  using (public.auth_is_manager() and exists (select 1 from public.reviews r where r.id = review_id))
  with check (public.auth_is_manager() and exists (select 1 from public.reviews r where r.id = review_id));
create policy "le responsable fait avancer son action" on public.review_actions
  for update to authenticated
  using (public.auth_is_self(owner_id))
  with check (public.auth_is_self(owner_id));

-- ─── Demandes de one-to-one ─────────────────────────────────────────────

create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 1000),
  preferred_date date,
  status public.request_status not null default 'en_attente',
  review_id uuid references public.reviews (id) on delete set null,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.review_requests enable row level security;
create policy "demandes visibles" on public.review_requests
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "demande créée par le collaborateur" on public.review_requests
  for insert to authenticated
  with check (public.auth_is_self(collaborator_id) and status = 'en_attente' and review_id is null
              and team_id = public.auth_team_id());
create policy "demande traitée par le manager" on public.review_requests
  for update to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id));

revoke all on all tables in schema public from anon;

-- ===== 20261104090300_operations.sql =====
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

-- ===== 20261105090000_grants.sql =====
-- Cadence — droits explicites sur l'API de données.
-- Les nouveaux projets Supabase n'accordent plus automatiquement l'accès aux tables créées en SQL :
-- on accorde ici ce que chaque rôle doit pouvoir faire. La RLS (déjà active partout) filtre les lignes.

-- Utilisateurs connectés : accès aux tables, filtré par les politiques RLS.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Visiteurs non connectés : aucun accès aux données métier.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Fonctions : Postgres accorde EXECUTE à PUBLIC par défaut ; on le réserve aux utilisateurs connectés.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- ===== 20261107090000_signup.sql =====
-- Cadence — inscription des managers et équipes de démonstration.
-- Un manager qui s'inscrit (avec le code d'accès du groupe) obtient sa propre équipe,
-- pré-remplie à partir de l'équipe modèle (jeu de démonstration Valmont Équipements) :
-- collaborateurs fictifs avec de vrais comptes de connexion, objectifs, tâches, entretiens…

-- Identifiants des comptes collaborateurs de démonstration, visibles par le manager de l'équipe.
-- Le mot de passe est stocké en clair volontairement : ce sont des comptes fictifs partagés.
create table public.demo_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  password text not null,
  created_at timestamptz not null default now()
);
create index demo_accounts_team_idx on public.demo_accounts (team_id);

alter table public.demo_accounts enable row level security;
create policy "identifiants démo visibles par le manager" on public.demo_accounts
  for select to authenticated using (team_id = public.auth_team_id() and public.auth_is_manager());

revoke all on public.demo_accounts from anon, authenticated;
grant select on public.demo_accounts to authenticated;
grant select, insert, update, delete on public.demo_accounts to service_role;

-- Collaborateurs de l'équipe modèle : un compte de démonstration est créé pour chacun.
create function public.demo_template_people()
returns table (id uuid, first_name text, last_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name
  from public.profiles p
  where p.team_id = '22222222-0000-4000-8000-000000000001' and p.role = 'collaborateur'
  order by p.last_name, p.first_name
$$;

-- Crée l'équipe et le profil du manager, puis copie l'équipe modèle.
-- p_demo : [{ "template_id": uuid, "user_id": uuid, "email": text }] — un élément par
-- collaborateur renvoyé par demo_template_people(), comptes Auth déjà créés.
-- Copie générique : pour chaque table (dans l'ordre des clés étrangères), les lignes qui
-- référencent un identifiant déjà copié sont dupliquées avec de nouveaux identifiants ;
-- les dates sont décalées d'un nombre entier de semaines pour rester proches d'aujourd'hui.
create function public.provision_manager_team(
  p_manager_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_job_title text,
  p_team_name text,
  p_company text,
  p_demo jsonb default '[]',
  p_demo_password text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_template constant uuid := '22222222-0000-4000-8000-000000000001';
  -- Tables copiées, dans l'ordre de création des migrations (ordre compatible avec les clés étrangères).
  v_tables constant text[] := array[
    'manager_notes', 'login_events', 'team_settings',
    'objectives', 'key_results', 'key_result_history', 'skills', 'skill_levels', 'feedbacks', 'weather_entries',
    'review_templates', 'template_questions', 'reviews', 'review_answers', 'review_actions', 'review_requests',
    'projects', 'tasks', 'workload_allocations', 'absences', 'meetings', 'decisions', 'meeting_actions',
    'delegation_domains', 'delegations'
  ];
  v_team uuid := gen_random_uuid();
  v_shift int;
  v_table text;
  v_cols text;
  v_exprs text;
  v_pred text;
  v_has_id boolean;
  c record;
begin
  insert into public.teams (id, name, company) values (v_team, p_team_name, p_company);
  insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title)
  values (p_manager_id, v_team, 'manager', p_first_name, p_last_name, lower(p_email), p_job_title);

  if jsonb_array_length(coalesce(p_demo, '[]')) = 0 or not exists (select 1 from public.teams where id = v_template) then
    insert into public.team_settings (team_id) values (v_team);
    return v_team;
  end if;

  create temp table if not exists pg_temp.clone_map (old uuid primary key, new uuid not null) on commit drop;
  truncate pg_temp.clone_map;
  insert into pg_temp.clone_map values (v_template, v_team);
  insert into pg_temp.clone_map select p.id, p_manager_id from public.profiles p where p.team_id = v_template and p.role = 'manager';
  insert into pg_temp.clone_map select (d ->> 'template_id')::uuid, (d ->> 'user_id')::uuid from jsonb_array_elements(p_demo) d;

  if exists (select 1 from public.profiles p where p.team_id = v_template and not exists (select 1 from pg_temp.clone_map m where m.old = p.id)) then
    raise exception 'Équipe de démonstration incomplète : réessayez.';
  end if;

  insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title, hired_on, is_active)
  select m.new, v_team, 'collaborateur', p.first_name, p.last_name, lower(d ->> 'email'), p.job_title, p.hired_on, p.is_active
  from jsonb_array_elements(p_demo) d
  join public.profiles p on p.id = (d ->> 'template_id')::uuid
  join pg_temp.clone_map m on m.old = p.id;

  insert into public.demo_accounts (user_id, team_id, password)
  select (d ->> 'user_id')::uuid, v_team, p_demo_password from jsonb_array_elements(p_demo) d;

  -- Décalage en semaines entières : les colonnes « semaine » (lundi) restent alignées.
  select greatest(0, (current_date - t.created_at::date) / 7 * 7) into v_shift from public.teams t where t.id = v_template;

  foreach v_table in array v_tables loop
    v_cols := null; v_exprs := null; v_pred := null; v_has_id := false;
    for c in
      select column_name::text as name, udt_name::text as udt
      from information_schema.columns
      where table_schema = 'public' and table_name = v_table and is_generated = 'NEVER' and is_identity = 'NO'
      order by ordinal_position
    loop
      v_cols := concat_ws(', ', v_cols, quote_ident(c.name));
      if c.udt = 'uuid' then
        if c.name = 'id' then
          v_has_id := true;
        else
          v_pred := concat_ws(' or ', v_pred, format('s.%I in (select old from pg_temp.clone_map)', c.name));
        end if;
        v_exprs := concat_ws(', ', v_exprs, format('coalesce((select m.new from pg_temp.clone_map m where m.old = s.%1$I), s.%1$I)', c.name));
      elsif c.udt = '_uuid' then
        v_exprs := concat_ws(', ', v_exprs,
          format('array(select coalesce((select m.new from pg_temp.clone_map m where m.old = e), e) from unnest(s.%I) e)', c.name));
      elsif c.udt = 'date' then
        v_exprs := concat_ws(', ', v_exprs, format('s.%I + %s', c.name, v_shift));
      elsif c.udt in ('timestamptz', 'timestamp') then
        v_exprs := concat_ws(', ', v_exprs, format('s.%I + make_interval(days => %s)', c.name, v_shift));
      else
        v_exprs := concat_ws(', ', v_exprs, format('s.%I', c.name));
      end if;
    end loop;

    continue when v_pred is null;
    if v_has_id then
      execute format('insert into pg_temp.clone_map (old, new) select s.id, gen_random_uuid() from public.%I s where %s', v_table, v_pred);
    end if;
    execute format('insert into public.%I (%s) select %s from public.%I s where %s', v_table, v_cols, v_exprs, v_table, v_pred);
  end loop;

  insert into public.team_settings (team_id) values (v_team) on conflict do nothing;
  return v_team;
end $$;

-- Réservées au service (Edge Function signup-manager) : jamais appelables depuis le navigateur.
revoke execute on function public.demo_template_people() from public, anon, authenticated;
revoke execute on function public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.demo_template_people() to service_role;
grant execute on function public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text) to service_role;

-- ===== 20261108090000_pulse.sql =====
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

-- ===== 20261109090000_pulse_workload.sql =====
-- Cadence — le pouls du jour remplace la météo hebdomadaire : il demande aussi la charge de travail
-- (1 très légère → 5 surchargé). Les pouls déjà saisis n'avaient pas cette question : valeur inconnue (null).

alter table public.daily_pulses
  add column workload smallint check (workload between 1 and 5);

-- Historique de démonstration sur 6 mois (courbes et alertes hebdomadaires alimentées),
-- sans aujourd'hui. Julien Mercier : moral en baisse et surcharge sur les derniers jours.
create or replace function public.generate_demo_pulses(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.daily_pulses (team_id, collaborator_id, day, mood, energy, workload, note, created_at, updated_at)
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
      when p.first_name = 'Julien' and d.day > public.paris_today() - 6 then 5
      when p.first_name = 'Nadia' and d.day > public.paris_today() - 15 then 4 + abs(hashtext('w' || d.day::text)) % 2
      else 2 + abs(hashtext('w' || p.id::text || d.day::text)) % 3
    end,
    case
      when p.first_name = 'Julien' and d.day = public.paris_today() - 1 then 'Encore une astreinte cette nuit, je commence à fatiguer.'
      when abs(hashtext('n' || p.id::text || d.day::text)) % 23 = 0 then 'Bonne journée, chantier qui avance bien.'
      else ''
    end,
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris',
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris'
  from public.profiles p
  cross join lateral (select g::date as day from generate_series(public.paris_today() - 180, public.paris_today() - 1, interval '1 day') g) d
  where p.team_id = p_team and p.role = 'collaborateur' and p.is_active
    -- Uniquement des personnes fictives : l'équipe modèle, ou les comptes de démonstration d'une équipe.
    and (p_team = '22222222-0000-4000-8000-000000000001' or exists (select 1 from public.demo_accounts a where a.user_id = p.id))
    and extract(isodow from d.day) < 6
    and abs(hashtext('s' || p.id::text || d.day::text)) % 7 <> 0
  on conflict (collaborator_id, day) do nothing;
end $$;

revoke execute on function public.generate_demo_pulses(uuid) from public, anon, authenticated;
grant execute on function public.generate_demo_pulses(uuid) to service_role;

-- Équipe modèle : historique régénéré (charge comprise) pour les prochaines inscriptions.
delete from public.daily_pulses where team_id = '22222222-0000-4000-8000-000000000001';
select public.generate_demo_pulses(t.id) from public.teams t where t.id = '22222222-0000-4000-8000-000000000001';

-- Équipes déjà créées : leurs collaborateurs fictifs reçoivent la charge et 6 mois d'historique.
update public.daily_pulses d set workload = 2 + abs(hashtext('w' || d.collaborator_id::text || d.day::text)) % 3
from public.profiles p
where p.id = d.collaborator_id and d.workload is null and p.email like '%@cadence-demo.example';
select public.generate_demo_pulses(t.id)
from public.teams t
where exists (select 1 from public.demo_accounts a where a.team_id = t.id);

-- ===== 20261110090000_notifications.sql =====
-- Cadence — rappels et notifications (Web Push).
-- • push_subscriptions : un abonnement par appareil (navigateur ou application installée).
-- • notification_prefs : choix de chaque utilisateur (rappel du pouls et son heure, récap du lundi,
--   demandes de one-to-one) et dates du dernier envoi (au plus un rappel par jour, un récap par semaine).
-- • Sur Supabase : tâche planifiée (pg_cron + pg_net) qui appelle l'Edge Function send-reminders
--   chaque heure en matinée, du lundi au vendredi.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "abonnements : les siens" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  pulse_reminder boolean not null default true,
  pulse_hour smallint not null default 9 check (pulse_hour between 7 and 12),
  weekly_recap boolean not null default true,
  request_alerts boolean not null default true,
  last_pulse_reminder date,
  last_recap date,
  updated_at timestamptz not null default now()
);
create trigger notification_prefs_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

alter table public.notification_prefs enable row level security;
create policy "préférences : les siennes" on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.push_subscriptions, public.notification_prefs from anon;
grant select, insert, update, delete on public.push_subscriptions, public.notification_prefs to authenticated;
grant select, insert, update, delete on public.push_subscriptions, public.notification_prefs to service_role;

-- Planification (Supabase uniquement : la base de démonstration locale n'a pas pg_cron).
-- L'Edge Function ne fait rien hors de la plage horaire prévue et n'envoie qu'un rappel par jour
-- et par personne : un appel en trop est sans effet.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.unschedule(jobid) from cron.job where jobname = 'connect-team-rappels';
    -- Toutes les heures de 5 h à 11 h UTC (7 h à 12 h à Paris selon la saison), du lundi au vendredi.
    perform cron.schedule(
      'connect-team-rappels',
      '0 5-11 * * 1-5',
      $job$
        select net.http_post(
          url := 'https://zwfxctoycuxhqukdopbk.supabase.co/functions/v1/send-reminders',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb
        )
      $job$
    );
  end if;
end $$;

-- ===== 20261111090000_review_reminders.sql =====
-- Cadence — rappel le matin d'un entretien : « Entretien aujourd'hui à 14:00 avec … »,
-- pour le manager et le collaborateur. Au plus un rappel par jour et par personne.
alter table public.notification_prefs
  add column review_alerts boolean not null default true,
  add column last_review_reminder date;

-- ===== 20261112090000_feedback_kinds.sql =====
-- Connect Team — les trois feedbacks du manager (cours « Le feed-back et la méthode DESC ») :
-- reconnaissance, amélioration, recadrage. Les anciennes valeurs (point fort, axe de progrès)
-- sont converties dans la migration suivante (une nouvelle valeur d'enum n'est utilisable
-- qu'après la validation de la transaction qui l'ajoute).

alter type public.feedback_kind add value if not exists 'amelioration';
alter type public.feedback_kind add value if not exists 'recadrage';
commit;

-- ===== 20261112090100_course_tools.sql =====
-- Connect Team — les outils du cours traduits dans l'application :
-- • DISC : profil de communication de chaque collaborateur, renseigné avec lui et visible par lui ;
-- • carnet d'observations : faits notés au fil de la semaine pour préparer le 1 à 1 et les feedbacks ;
-- • feedback DESC : Décrire, Exprimer, Spécifier, Conséquences ;
-- • objectifs SMART : moyens fournis par le manager et accord du collaborateur (A et R) ;
-- • délégation : mission confiée avec limites, échéance, points de contrôle et note d'autonomie ;
-- • aide à la décision : diagnostic Comprendre / Savoir / Pouvoir / Vouloir et contrôle SCARF ;
-- • 1 à 1 (kit Keylia) : préparation privée du manager, priorité retenue et reformulation.

-- ─── Feedbacks : les trois feedbacks du cours et la structure DESC ───────

update public.feedbacks set kind = 'reconnaissance' where kind = 'point_fort';
update public.feedbacks set kind = 'amelioration' where kind = 'axe_progres';

alter table public.feedbacks
  add column desc_d text not null default '' check (char_length(desc_d) <= 1000),
  add column desc_e text not null default '' check (char_length(desc_e) <= 1000),
  add column desc_s text not null default '' check (char_length(desc_s) <= 1000),
  add column desc_c text not null default '' check (char_length(desc_c) <= 1000);

-- ─── Profil DISC ─────────────────────────────────────────────────────────

create table public.disc_profiles (
  collaborator_id uuid primary key references public.profiles (id) on delete cascade,
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  primary_style text not null check (primary_style in ('D', 'I', 'S', 'C')),
  secondary_style text check (secondary_style in ('D', 'I', 'S', 'C')),
  source text not null default 'echange' check (source in ('auto_evaluation', 'echange')),
  note text not null default '' check (char_length(note) <= 500),
  updated_by uuid default auth.uid() references public.profiles (id),
  updated_at timestamptz not null default now(),
  check (secondary_style is distinct from primary_style)
);
create trigger disc_profiles_updated_at before update on public.disc_profiles
  for each row execute function public.set_updated_at();

alter table public.disc_profiles enable row level security;
-- Transparence : le collaborateur voit et peut corriger son profil ; le manager de l'équipe aussi.
create policy "profil DISC visible par soi et son manager" on public.disc_profiles
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "profil DISC saisi par soi ou son manager" on public.disc_profiles
  for insert to authenticated
  with check ((public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id)) and team_id = public.auth_team_id());
create policy "profil DISC modifié par soi ou son manager" on public.disc_profiles
  for update to authenticated
  using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id))
  with check ((public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id)) and team_id = public.auth_team_id());
create policy "profil DISC supprimé par le manager" on public.disc_profiles
  for delete to authenticated using (public.auth_manages(collaborator_id));

-- ─── Carnet d'observations (privé au manager) ───────────────────────────

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id),
  observed_on date not null default public.paris_today(),
  tone text not null default 'neutre' check (tone in ('positif', 'a_ajuster', 'neutre')),
  body text not null check (char_length(body) between 3 and 500),
  created_at timestamptz not null default now()
);
create index observations_collaborator_idx on public.observations (collaborator_id, observed_on desc);

alter table public.observations enable row level security;
create policy "carnet : manager uniquement" on public.observations
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and author_id = auth.uid() and team_id = public.auth_team_id());

-- ─── Objectifs SMART ─────────────────────────────────────────────────────

alter table public.objectives
  add column means text not null default '' check (char_length(means) <= 500),
  add column agreed boolean not null default false;

-- ─── Missions déléguées ─────────────────────────────────────────────────

create table public.delegation_missions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  expected_result text not null default '' check (char_length(expected_result) <= 500),
  limits text not null default '' check (char_length(limits) <= 500),
  support text not null default '' check (char_length(support) <= 500),
  checkpoints text not null default '' check (char_length(checkpoints) <= 300),
  due_date date,
  autonomy smallint not null default 2 check (autonomy between 1 and 5),
  status text not null default 'en_cours' check (status in ('en_cours', 'terminee')),
  debrief text not null default '' check (char_length(debrief) <= 1000),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index delegation_missions_collaborator_idx on public.delegation_missions (collaborator_id, created_at desc);
create trigger delegation_missions_updated_at before update on public.delegation_missions
  for each row execute function public.set_updated_at();

alter table public.delegation_missions enable row level security;
create policy "missions visibles par soi et son manager" on public.delegation_missions
  for select to authenticated using (public.auth_is_self(collaborator_id) or public.auth_manages(collaborator_id));
create policy "missions gérées par le manager" on public.delegation_missions
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and team_id = public.auth_team_id());

-- ─── Aide à la décision (privée au manager) ─────────────────────────────

create table public.posture_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id),
  collaborator_id uuid not null references public.profiles (id) on delete cascade,
  situation text not null check (char_length(situation) between 3 and 1000),
  diagnosis text not null check (diagnosis in ('comprendre', 'savoir', 'pouvoir', 'vouloir')),
  scarf jsonb not null default '{}' check (jsonb_typeof(scarf) = 'object'),
  decision text not null default '' check (char_length(decision) <= 1000),
  next_step text not null default 'one_to_one' check (next_step in ('one_to_one', 'feedback', 'delegation', 'formation', 'moyens', 'objectif')),
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index posture_notes_collaborator_idx on public.posture_notes (collaborator_id, created_at desc);

alter table public.posture_notes enable row level security;
create policy "décisions : manager uniquement" on public.posture_notes
  for all to authenticated
  using (public.auth_manages(collaborator_id))
  with check (public.auth_manages(collaborator_id) and team_id = public.auth_team_id());

-- ─── 1 à 1 : préparation privée du manager, engagement final ────────────

alter table public.reviews
  add column priority text not null default '' check (char_length(priority) <= 300),
  add column reformulated_at timestamptz;

create table public.review_preps (
  review_id uuid primary key references public.reviews (id) on delete cascade,
  theme text not null default '' check (char_length(theme) <= 300),
  company_news text not null default '' check (char_length(company_news) <= 1000),
  posture text check (posture in ('rassurant', 'challengeant', 'leger', 'serieux')),
  checklist jsonb not null default '[]' check (jsonb_typeof(checklist) = 'array'),
  updated_at timestamptz not null default now()
);
create trigger review_preps_updated_at before update on public.review_preps
  for each row execute function public.set_updated_at();

-- Lecture de reviews sans RLS : le manager de l'équipe du collaborateur concerné.
create function public.auth_manages_review(p_review_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.reviews r where r.id = p_review_id and public.auth_manages(r.collaborator_id))
$$;

alter table public.review_preps enable row level security;
create policy "préparation privée du manager" on public.review_preps
  for all to authenticated
  using (public.auth_manages_review(review_id))
  with check (public.auth_manages_review(review_id));

-- ─── Éthique : le manager ne consulte plus les connexions de son équipe ─
-- Le journal sert à la sécurité du compte : chacun ne lit que ses propres connexions.

drop policy "journal lisible par le manager" on public.login_events;
create policy "journal lisible par soi" on public.login_events
  for select to authenticated using (user_id = auth.uid());

-- ─── Droits API ─────────────────────────────────────────────────────────

revoke all on public.disc_profiles, public.observations, public.delegation_missions, public.posture_notes, public.review_preps from anon;
grant select, insert, update, delete on public.disc_profiles, public.observations, public.delegation_missions, public.posture_notes, public.review_preps
  to authenticated, service_role;
revoke execute on function public.auth_manages_review(uuid) from public, anon;
grant execute on function public.auth_manages_review(uuid) to authenticated, service_role;

-- ─── Copie de l'équipe modèle : nouvelles tables incluses ───────────────

create or replace function public.provision_manager_team(
  p_manager_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_job_title text,
  p_team_name text,
  p_company text,
  p_demo jsonb default '[]',
  p_demo_password text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_template constant uuid := '22222222-0000-4000-8000-000000000001';
  -- Tables copiées, dans l'ordre de création des migrations (ordre compatible avec les clés étrangères).
  v_tables constant text[] := array[
    'manager_notes', 'login_events', 'team_settings',
    'objectives', 'key_results', 'key_result_history', 'skills', 'skill_levels', 'feedbacks', 'weather_entries',
    'review_templates', 'template_questions', 'reviews', 'review_answers', 'review_actions', 'review_requests',
    'projects', 'tasks', 'workload_allocations', 'absences', 'meetings', 'decisions', 'meeting_actions',
    'delegation_domains', 'delegations',
    'disc_profiles', 'observations', 'delegation_missions', 'posture_notes', 'review_preps'
  ];
  v_team uuid := gen_random_uuid();
  v_shift int;
  v_table text;
  v_cols text;
  v_exprs text;
  v_pred text;
  v_has_id boolean;
  c record;
begin
  insert into public.teams (id, name, company) values (v_team, p_team_name, p_company);
  insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title)
  values (p_manager_id, v_team, 'manager', p_first_name, p_last_name, lower(p_email), p_job_title);

  if jsonb_array_length(coalesce(p_demo, '[]')) = 0 or not exists (select 1 from public.teams where id = v_template) then
    insert into public.team_settings (team_id) values (v_team);
    return v_team;
  end if;

  create temp table if not exists pg_temp.clone_map (old uuid primary key, new uuid not null) on commit drop;
  truncate pg_temp.clone_map;
  insert into pg_temp.clone_map values (v_template, v_team);
  insert into pg_temp.clone_map select p.id, p_manager_id from public.profiles p where p.team_id = v_template and p.role = 'manager';
  insert into pg_temp.clone_map select (d ->> 'template_id')::uuid, (d ->> 'user_id')::uuid from jsonb_array_elements(p_demo) d;

  if exists (select 1 from public.profiles p where p.team_id = v_template and not exists (select 1 from pg_temp.clone_map m where m.old = p.id)) then
    raise exception 'Équipe de démonstration incomplète : réessayez.';
  end if;

  insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title, hired_on, is_active)
  select m.new, v_team, 'collaborateur', p.first_name, p.last_name, lower(d ->> 'email'), p.job_title, p.hired_on, p.is_active
  from jsonb_array_elements(p_demo) d
  join public.profiles p on p.id = (d ->> 'template_id')::uuid
  join pg_temp.clone_map m on m.old = p.id;

  insert into public.demo_accounts (user_id, team_id, password)
  select (d ->> 'user_id')::uuid, v_team, p_demo_password from jsonb_array_elements(p_demo) d;

  -- Décalage en semaines entières : les colonnes « semaine » (lundi) restent alignées.
  select greatest(0, (current_date - t.created_at::date) / 7 * 7) into v_shift from public.teams t where t.id = v_template;

  foreach v_table in array v_tables loop
    v_cols := null; v_exprs := null; v_pred := null; v_has_id := false;
    for c in
      select column_name::text as name, udt_name::text as udt
      from information_schema.columns
      where table_schema = 'public' and table_name = v_table and is_generated = 'NEVER' and is_identity = 'NO'
      order by ordinal_position
    loop
      v_cols := concat_ws(', ', v_cols, quote_ident(c.name));
      if c.udt = 'uuid' then
        if c.name = 'id' then
          v_has_id := true;
        else
          v_pred := concat_ws(' or ', v_pred, format('s.%I in (select old from pg_temp.clone_map)', c.name));
        end if;
        v_exprs := concat_ws(', ', v_exprs, format('coalesce((select m.new from pg_temp.clone_map m where m.old = s.%1$I), s.%1$I)', c.name));
      elsif c.udt = '_uuid' then
        v_exprs := concat_ws(', ', v_exprs,
          format('array(select coalesce((select m.new from pg_temp.clone_map m where m.old = e), e) from unnest(s.%I) e)', c.name));
      elsif c.udt = 'date' then
        v_exprs := concat_ws(', ', v_exprs, format('s.%I + %s', c.name, v_shift));
      elsif c.udt in ('timestamptz', 'timestamp') then
        v_exprs := concat_ws(', ', v_exprs, format('s.%I + make_interval(days => %s)', c.name, v_shift));
      else
        v_exprs := concat_ws(', ', v_exprs, format('s.%I', c.name));
      end if;
    end loop;

    continue when v_pred is null;
    if v_has_id then
      execute format('insert into pg_temp.clone_map (old, new) select s.id, gen_random_uuid() from public.%I s where %s', v_table, v_pred);
    end if;
    execute format('insert into public.%I (%s) select %s from public.%I s where %s', v_table, v_cols, v_exprs, v_table, v_pred);
  end loop;

  insert into public.team_settings (team_id) values (v_team) on conflict do nothing;
  return v_team;
end $$;

revoke execute on function public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text) to service_role;

-- ===== 20261112090200_demo_nebuleo.sql =====
-- Connect Team — nouvelle équipe modèle (données 100 % fictives) : Nébuleo, éditeur de logiciels.
-- Persona : Camille Lefèvre, Engineering Manager de la squad Planning (7 collaborateurs).
-- Scénario de démonstration (jalon 2) : Hugo Lambert, habituellement moteur, est en retrait depuis
-- deux semaines (pouls en baisse, silence au daily) et a manqué deux échéances.
--
-- L'ancienne équipe modèle (Valmont Équipements) est désactivée : les équipes déjà créées gardent
-- leurs données ; les nouvelles inscriptions copient désormais l'équipe Nébuleo.
-- Dates relatives à current_date : le jeu reste crédible quel que soit le jour du lancement.
-- Mot de passe commun des comptes de démonstration : Cadence-Demo26!

-- ─── L'équipe modèle change d'identifiant ───────────────────────────────

create or replace function public.demo_template_people()
returns table (id uuid, first_name text, last_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name
  from public.profiles p
  where p.team_id = '22222222-0000-4000-8000-000000000002' and p.role = 'collaborateur'
  order by p.last_name, p.first_name
$$;
revoke execute on function public.demo_template_people() from public, anon, authenticated;
grant execute on function public.demo_template_people() to service_role;

-- provision_manager_team : seule la constante de l'équipe modèle change (copie générique inchangée).
do $$
declare
  v_def text := pg_get_functiondef('public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text)'::regprocedure);
begin
  execute replace(v_def, '22222222-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002');
end $$;

-- Pouls de démonstration : historique de 6 mois pour les personnes fictives,
-- avec le scénario d'Hugo (moteur en retrait) et la charge élevée d'Inès.
create or replace function public.generate_demo_pulses(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.paris_today();
begin
  insert into public.daily_pulses (team_id, collaborator_id, day, mood, energy, workload, note, created_at, updated_at)
  select
    p_team,
    p.id,
    d.day,
    case
      when s.hugo and d.day > v_today - 15 then 1 + abs(hashtext(p.id::text || d.day::text)) % 2
      when s.hugo then 4 + abs(hashtext(p.id::text || d.day::text)) % 2
      else greatest(2, 3 + abs(hashtext(p.id::text || d.day::text)) % 3 - (case when abs(hashtext(d.day::text || p.id::text)) % 6 = 0 then 1 else 0 end))
    end,
    case
      when s.hugo and d.day > v_today - 15 then 1 + abs(hashtext('e' || d.day::text)) % 2
      when s.hugo then 4 + abs(hashtext('e' || p.id::text || d.day::text)) % 2
      else greatest(2, 3 + abs(hashtext('e' || p.id::text || d.day::text)) % 3 - (case when abs(hashtext('f' || d.day::text)) % 5 = 0 then 1 else 0 end))
    end,
    case
      when s.hugo and d.day > v_today - 15 then 3 + abs(hashtext('w' || d.day::text)) % 2
      when s.ines and d.day > v_today - 11 then 4 + abs(hashtext('w' || d.day::text)) % 2
      else 2 + abs(hashtext('w' || p.id::text || d.day::text)) % 3
    end,
    case
      when s.hugo and d.day = v_today - 4 then 'Fatigué.'
      when s.hugo and d.day > v_today - 15 then ''
      when s.hugo and abs(hashtext('n' || d.day::text)) % 9 = 0 then 'Bonne journée, la synchro avance bien !'
      when s.ines and d.day = v_today - 1 then 'Beaucoup de sujets en parallèle avec le design system.'
      when abs(hashtext('n' || p.id::text || d.day::text)) % 23 = 0 then 'Bonne journée, sprint qui avance bien.'
      else ''
    end,
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris',
    (d.day + time '08:40' + make_interval(mins => abs(hashtext(p.id::text)) % 70)) at time zone 'Europe/Paris'
  from public.profiles p
  cross join lateral (select p.first_name = 'Hugo' and p.last_name = 'Lambert' as hugo, p.first_name = 'Inès' and p.last_name = 'Moreau' as ines) s
  cross join lateral (select g::date as day from generate_series(v_today - 180, v_today - 1, interval '1 day') g) d
  where p.team_id = p_team and p.role = 'collaborateur' and p.is_active
    -- Uniquement des personnes fictives : l'équipe modèle, ou les comptes de démonstration d'une équipe.
    and (p_team = '22222222-0000-4000-8000-000000000002' or exists (select 1 from public.demo_accounts a where a.user_id = p.id))
    and extract(isodow from d.day) < 6
    and abs(hashtext('s' || p.id::text || d.day::text)) % 7 <> 0
    -- Hugo ne répond plus qu'un jour sur deux depuis une semaine (silence).
    and not (s.hugo and d.day > v_today - 8 and abs(hashtext('h' || d.day::text)) % 2 = 0)
  on conflict (collaborator_id, day) do nothing;
end $$;
revoke execute on function public.generate_demo_pulses(uuid) from public, anon, authenticated;
grant execute on function public.generate_demo_pulses(uuid) to service_role;

-- Ancienne équipe modèle : comptes désactivés (données conservées, plus de connexion).
update public.profiles set is_active = false where team_id = '22222222-0000-4000-8000-000000000001';

-- ─── Outils du jeu ──────────────────────────────────────────────────────

create function pg_temp.ts(d date, t text) returns timestamptz language sql as $$
  select (d + t::time) at time zone 'Europe/Paris'
$$;
create function pg_temp.noise(seed text, n int) returns int language sql as $$
  select abs(hashtext(seed)) % n
$$;

create temp table seed_people (key text primary key, id uuid, first_name text, last_name text, email text, job text, hired date, role public.app_role);
insert into seed_people values
  ('camille',  '11111111-0000-4000-8000-000000000101', 'Camille',  'Lefèvre', 'camille.lefevre@nebuleo.example',  'Engineering Manager', '2018-04-03', 'manager'),
  ('hugo',     '11111111-0000-4000-8000-000000000102', 'Hugo',     'Lambert', 'hugo.lambert@nebuleo.example',     'Développeur back-end senior', '2019-09-02', 'collaborateur'),
  ('ines',     '11111111-0000-4000-8000-000000000103', 'Inès',     'Moreau',  'ines.moreau@nebuleo.example',      'Développeuse front-end', '2021-03-15', 'collaborateur'),
  ('lucas',    '11111111-0000-4000-8000-000000000104', 'Lucas',    'Petit',   'lucas.petit@nebuleo.example',      'Développeur full-stack (alternant)', '2025-09-01', 'collaborateur'),
  ('amandine', '11111111-0000-4000-8000-000000000105', 'Amandine', 'Roy',     'amandine.roy@nebuleo.example',     'Ingénieure qualité logicielle', '2020-06-08', 'collaborateur'),
  ('yanis',    '11111111-0000-4000-8000-000000000106', 'Yanis',    'Cherif',  'yanis.cherif@nebuleo.example',     'Développeur mobile', '2022-11-07', 'collaborateur'),
  ('mehdi',    '11111111-0000-4000-8000-000000000107', 'Mehdi',    'Faure',   'mehdi.faure@nebuleo.example',      'Ingénieur DevOps', '2017-01-09', 'collaborateur'),
  ('sarah',    '11111111-0000-4000-8000-000000000108', 'Sarah',    'Nguyen',  'sarah.nguyen@nebuleo.example',     'Product designer', '2023-05-22', 'collaborateur');

create function pg_temp.p(k text) returns uuid language sql as $$ select id from seed_people where key = k $$;

-- ─── Comptes ────────────────────────────────────────────────────────────
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, extensions.crypt('Cadence-Demo26!', extensions.gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('first_name', first_name, 'last_name', last_name),
  now(), now(), '', '', '', ''
from seed_people;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id::text, id, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
from seed_people;

insert into public.teams (id, name, company) values ('22222222-0000-4000-8000-000000000002', 'Squad Planning', 'Nébuleo');
insert into public.team_settings (team_id) values ('22222222-0000-4000-8000-000000000002');

insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title, hired_on)
select id, '22222222-0000-4000-8000-000000000002', role, first_name, last_name, email, job, hired from seed_people;

-- ─── Journal des connexions ─────────────────────────────────────────────
insert into public.login_events (user_id, team_id, user_agent, created_at)
select sp.id, '22222222-0000-4000-8000-000000000002',
  (array['Chrome 131 · macOS', 'Firefox 133 · Ubuntu', 'Safari · iOS 18', 'Edge 131 · Windows 11'])[1 + pg_temp.noise(sp.key || g::text, 4)],
  now() - (g * interval '19 hours') - (pg_temp.noise(sp.key || g::text, 300) * interval '1 minute')
from seed_people sp cross join generate_series(0, 5) g
where pg_temp.noise(sp.key || g::text || 'x', 3) > 0;

-- ─── Projets ────────────────────────────────────────────────────────────
insert into public.projects (id, team_id, code, name, client) values
  ('33333333-0000-4000-8000-000000000101', '22222222-0000-4000-8000-000000000002', 'SYNC', 'Nouvelle synchronisation des agendas', 'Produit'),
  ('33333333-0000-4000-8000-000000000102', '22222222-0000-4000-8000-000000000002', 'MOB', 'Application mobile 3.0', 'Produit'),
  ('33333333-0000-4000-8000-000000000103', '22222222-0000-4000-8000-000000000002', 'API', 'API publique v2', 'Produit'),
  ('33333333-0000-4000-8000-000000000104', '22222222-0000-4000-8000-000000000002', 'RUN', 'Support et production', 'Clients'),
  ('33333333-0000-4000-8000-000000000105', '22222222-0000-4000-8000-000000000002', 'INT', 'Qualité et dette technique', 'Interne');

-- ─── Objectifs SMART et résultats clés ──────────────────────────────────
create temp table seed_obj (id uuid, owner text, title text, description text, means text, s int, e int);
insert into seed_obj values
  ('44444444-0000-4000-8000-000000000101', null, 'Livrer l''API publique v2', 'Ouvrir l''API v2 aux intégrateurs partenaires, documentée et testée, avant la fin du trimestre.', 'Sprint dédié en janvier, appui de l''équipe documentation.', -90, 60),
  ('44444444-0000-4000-8000-000000000102', null, 'Réduire les incidents en production', 'Moins de 2 incidents critiques par mois et une résolution plus rapide.', 'Astreinte outillée, post-mortem systématique.', -120, 45),
  ('44444444-0000-4000-8000-000000000103', null, 'Améliorer la note de l''application mobile', 'Passer de 3,6 à 4,3 sur les stores grâce à la version 3.0.', 'Tests utilisateurs menés par Sarah avant chaque version.', -60, 90),
  ('44444444-0000-4000-8000-000000000111', 'hugo', 'Migrer la synchronisation des agendas vers la nouvelle architecture', 'Migrer les 5 modules de synchronisation sans perte de données, avant le gel de fin d''année.', 'Une journée par semaine sans réunion ; revue d''architecture avec Mehdi.', -70, 20),
  ('44444444-0000-4000-8000-000000000112', 'ines', 'Mettre en place le design system front', '40 composants documentés et utilisés par toutes les équipes front.', 'Binôme avec Sarah sur les maquettes ; une demi-journée de guilde par sprint.', -100, 40),
  ('44444444-0000-4000-8000-000000000113', 'lucas', 'Monter en compétences sur les tests automatisés', 'Écrire 60 tests automatisés sur le module planning d''ici la fin de la période d''alternance en entreprise.', 'Binôme avec Amandine deux demi-journées par semaine.', -50, 70),
  ('44444444-0000-4000-8000-000000000114', 'amandine', 'Automatiser la recette de non-régression', 'Passer de 20 % à 70 % de scénarios de recette automatisés.', 'Licence de l''outil de test ; temps dédié chaque sprint.', -110, 50),
  ('44444444-0000-4000-8000-000000000115', 'yanis', 'Publier l''application mobile 3.0', 'Publication sur les deux stores avec un taux de sessions sans plantage supérieur à 99,5 %.', 'Accès aux appareils de test ; relecture de code par Hugo.', -80, 25),
  ('44444444-0000-4000-8000-000000000116', 'mehdi', 'Réduire le temps de déploiement', 'Passer de 45 à 10 minutes entre la fusion et la mise en production.', 'Budget pour les runners CI ; arbitrage des priorités en ma faveur.', -100, 60),
  ('44444444-0000-4000-8000-000000000117', 'sarah', 'Mener 12 tests utilisateurs sur le planning mobile', '12 tests menés et restitués à l''équipe avant la sortie de la 3.0.', 'Panel de clients fourni par le support.', -40, 30);

insert into public.objectives (id, team_id, scope, owner_id, title, description, means, agreed, start_date, due_date, created_by, created_at)
select id, '22222222-0000-4000-8000-000000000002', case when owner is null then 'equipe' else 'individuel' end::public.objective_scope,
  case when owner is null then null else pg_temp.p(owner) end, title, description, means, owner is not null,
  current_date + s, current_date + e, pg_temp.p('camille'), (current_date + s)::timestamptz
from seed_obj;

insert into public.key_results (objective_id, title, unit, start_value, target_value, current_value, pending_value, pending_at, validated_at, position) values
  ('44444444-0000-4000-8000-000000000101', 'Points d''API livrés', 'endpoints', 0, 24, 15, null, null, now() - interval '6 days', 0),
  ('44444444-0000-4000-8000-000000000101', 'Couverture de tests', '%', 55, 80, 68, null, null, now() - interval '6 days', 1),
  ('44444444-0000-4000-8000-000000000102', 'Incidents critiques par mois', 'incidents', 6, 2, 3, null, null, now() - interval '9 days', 0),
  ('44444444-0000-4000-8000-000000000102', 'Délai moyen de résolution', 'h', 30, 8, 14, null, null, now() - interval '9 days', 1),
  ('44444444-0000-4000-8000-000000000103', 'Note moyenne sur les stores', '/5', 3.6, 4.3, 4.0, null, null, now() - interval '12 days', 0),
  ('44444444-0000-4000-8000-000000000111', 'Modules de synchronisation migrés', 'modules', 0, 5, 2, null, null, now() - interval '16 days', 0),
  ('44444444-0000-4000-8000-000000000112', 'Composants documentés', 'composants', 0, 40, 31, 33, now() - interval '1 day', now() - interval '10 days', 0),
  ('44444444-0000-4000-8000-000000000113', 'Tests automatisés écrits', 'tests', 0, 60, 22, null, null, now() - interval '7 days', 0),
  ('44444444-0000-4000-8000-000000000114', 'Scénarios de recette automatisés', '%', 20, 70, 52, null, null, now() - interval '8 days', 0),
  ('44444444-0000-4000-8000-000000000115', 'Sessions sans plantage', '%', 97, 99.5, 99.1, null, null, now() - interval '5 days', 0),
  ('44444444-0000-4000-8000-000000000116', 'Durée d''un déploiement', 'min', 45, 10, 18, null, null, now() - interval '11 days', 0),
  ('44444444-0000-4000-8000-000000000117', 'Tests utilisateurs menés', 'tests', 0, 12, 7, null, null, now() - interval '4 days', 0);

insert into public.key_result_history (key_result_id, value, recorded_at, recorded_by)
select k.id,
  round((k.start_value + (k.current_value - k.start_value)
    * least(1, greatest(0, ((m.d - o.start_date)::numeric / greatest(1, current_date - o.start_date))
      + (pg_temp.noise(k.id::text || m.d::text, 13) - 6) / 100.0)))::numeric, 1),
  pg_temp.ts(m.d, '17:30'), pg_temp.p('camille')
from public.key_results k
join public.objectives o on o.id = k.objective_id
cross join lateral (select (date_trunc('month', current_date) - (g || ' months')::interval + interval '14 days')::date as d from generate_series(0, 6) g) m
where o.team_id = '22222222-0000-4000-8000-000000000002' and m.d >= o.start_date and m.d < current_date;

-- ─── Compétences ────────────────────────────────────────────────────────
create temp table seed_skills (pos int, name text, category text);
insert into seed_skills values
  (1, 'TypeScript', 'Développement'), (2, 'React', 'Développement'), (3, 'Node.js', 'Développement'),
  (4, 'PostgreSQL', 'Données'), (5, 'Kotlin et Swift', 'Mobile'), (6, 'Tests automatisés', 'Qualité'),
  (7, 'CI/CD et Docker', 'Infrastructure'), (8, 'Architecture logicielle', 'Conception'), (9, 'Revue de code', 'Pratiques d''équipe'),
  (10, 'Accessibilité (RGAA)', 'Qualité'), (11, 'Recherche utilisateur', 'Produit'), (12, 'Relation avec le support client', 'Produit');
insert into public.skills (team_id, name, category, created_at)
select '22222222-0000-4000-8000-000000000002', name, category, now() - interval '200 days' + pos * interval '1 minute' from seed_skills;

create temp table seed_levels (key text, levels int[]);
insert into seed_levels values
  ('hugo',     '{4,2,4,4,0,3,3,4,4,0,0,2}'), ('ines',     '{4,4,2,1,0,2,1,2,3,3,2,2}'),
  ('lucas',    '{2,2,2,1,0,1,1,1,1,1,0,1}'), ('amandine', '{2,1,1,2,0,4,3,2,3,3,1,3}'),
  ('yanis',    '{3,2,1,1,4,2,1,2,2,1,1,2}'), ('mehdi',    '{2,0,3,3,0,3,4,3,3,0,0,2}'),
  ('sarah',    '{1,2,0,0,0,0,0,1,1,4,4,3}');
insert into public.skill_levels (collaborator_id, skill_id, self_level, manager_level, validated_at)
select pg_temp.p(l.key), s.id,
  least(4, greatest(1, l.levels[ss.pos] + case pg_temp.noise(l.key || ss.pos, 7) when 0 then 1 when 1 then -1 else 0 end)),
  l.levels[ss.pos], now() - interval '40 days'
from seed_levels l
join seed_skills ss on l.levels[ss.pos] > 0
join public.skills s on s.name = ss.name and s.team_id = '22222222-0000-4000-8000-000000000002';
-- Auto-évaluation récente en attente de validation.
update public.skill_levels set self_level = 2, validated_at = null
  where collaborator_id = pg_temp.p('lucas')
    and skill_id = (select id from public.skills where name = 'Tests automatisés' and team_id = '22222222-0000-4000-8000-000000000002');

-- ─── Profils DISC (renseignés avec chaque collaborateur) ────────────────
insert into public.disc_profiles (collaborator_id, team_id, primary_style, secondary_style, source, note, updated_by, updated_at) values
  (pg_temp.p('hugo'),     '22222222-0000-4000-8000-000000000002', 'D', 'C', 'echange', 'Va droit au but, aime choisir ses moyens.', pg_temp.p('camille'), now() - interval '120 days'),
  (pg_temp.p('ines'),     '22222222-0000-4000-8000-000000000002', 'I', 'S', 'echange', 'Énergie communicative, besoin de reconnaissance devant l''équipe.', pg_temp.p('camille'), now() - interval '90 days'),
  (pg_temp.p('lucas'),    '22222222-0000-4000-8000-000000000002', 'S', 'C', 'auto_evaluation', '', pg_temp.p('lucas'), now() - interval '50 days'),
  (pg_temp.p('amandine'), '22222222-0000-4000-8000-000000000002', 'C', 'S', 'echange', 'Apprécie les faits précis et le suivi écrit.', pg_temp.p('camille'), now() - interval '150 days'),
  (pg_temp.p('yanis'),    '22222222-0000-4000-8000-000000000002', 'I', 'D', 'echange', '', pg_temp.p('camille'), now() - interval '80 days'),
  (pg_temp.p('mehdi'),    '22222222-0000-4000-8000-000000000002', 'C', 'D', 'auto_evaluation', '', pg_temp.p('mehdi'), now() - interval '200 days'),
  (pg_temp.p('sarah'),    '22222222-0000-4000-8000-000000000002', 'S', 'I', 'echange', 'Préfère être prévenue à l''avance des changements.', pg_temp.p('camille'), now() - interval '60 days');

-- ─── Carnet d'observations (privé au manager) ───────────────────────────
insert into public.observations (team_id, collaborator_id, author_id, observed_on, tone, body, created_at)
select '22222222-0000-4000-8000-000000000002', pg_temp.p(o.who), pg_temp.p('camille'), current_date + o.d, o.tone, o.body, pg_temp.ts(current_date + o.d, '18:05')
from (values
  ('hugo', -46, 'positif', 'A animé la rétrospective avec beaucoup d''énergie et proposé trois pistes concrètes pour la synchro.'),
  ('hugo', -13, 'a_ajuster', 'Caméra coupée et aucune prise de parole au daily, ce qui ne lui ressemble pas.'),
  ('hugo', -9, 'a_ajuster', 'Module « agenda partagé » prévu mercredi non livré, sans alerte en amont.'),
  ('hugo', -6, 'neutre', 'A décliné le déjeuner d''équipe, dit être « sous l''eau ».'),
  ('hugo', -3, 'a_ajuster', 'Deuxième échéance manquée : correctif de l''export iCal. Revue de code de Yanis sans réponse depuis quatre jours.'),
  ('ines', -4, 'positif', 'A aidé Lucas à débloquer son environnement de développement sans qu''on le lui demande.'),
  ('lucas', -2, 'positif', 'Première démo en revue de sprint : claire, bien préparée, a répondu seul aux questions.'),
  ('yanis', -3, 'a_ajuster', 'Lundi et mercredi au daily, a coupé la parole à Lucas à trois reprises.'),
  ('amandine', -8, 'positif', 'A détecté une régression critique sur les rappels avant la mise en production.'),
  ('mehdi', -5, 'positif', 'Incident de base de données résolu en 40 minutes, post-mortem publié le lendemain.')
) as o(who, d, tone, body);

-- ─── Feedbacks (reconnaissance, amélioration, recadrage · méthode DESC) ─
insert into public.feedbacks (team_id, collaborator_id, author_id, kind, body, desc_d, desc_e, desc_s, desc_c, is_shared, created_at)
select '22222222-0000-4000-8000-000000000002', pg_temp.p(f.who), pg_temp.p('camille'), f.kind::public.feedback_kind,
  concat_ws(' ', nullif(f.d, ''), nullif(f.e, ''), nullif(f.s, ''), nullif(f.c, '')), f.d, f.e, f.s, f.c, f.shared, now() - (f.ago || ' days')::interval
from (values
  ('hugo', 'reconnaissance', 'Ta revue d''architecture du 12 a permis d''éviter deux semaines de refonte sur la synchro.', 'Ça m''a ôté une vraie inquiétude pour le planning du trimestre.', '', '', true, 41),
  ('ines', 'reconnaissance', 'Mardi, tu as pris le temps de débloquer l''environnement de Lucas alors que tu avais ta propre livraison.', 'J''ai apprécié : c''est exactement l''esprit d''entraide que je veux dans l''équipe.', '', '', true, 4),
  ('lucas', 'amelioration', 'Sur tes deux dernières pull requests, les tests ont été ajoutés après la revue, à la demande d''Amandine.', 'Je suis un peu préoccupée : la revue prend deux fois plus de temps.', 'Comment pourrais-tu intégrer les tests dès le départ ? Je te propose d''écrire le test avant le code sur la prochaine tâche.', 'Tes revues iront plus vite et tu progresseras sur ton objectif de tests automatisés.', true, 9),
  ('amandine', 'reconnaissance', 'Jeudi, tu as détecté la régression sur les rappels avant la mise en production.', 'Grâce à toi, aucun client n''a été impacté : merci.', '', '', true, 8),
  ('yanis', 'recadrage', 'Lundi et mercredi au daily, tu as coupé la parole à Lucas à trois reprises pendant qu''il présentait son avancement.', 'Je suis gênée : Lucas ne s''exprime plus et j''ai besoin que chacun ose parler.', 'Comment as-tu vécu ces moments ? Je te demande de laisser finir chaque point et de poser tes questions à la fin.', 'Ton énergie est précieuse : dite au bon moment, elle tirera toute l''équipe.', false, 2),
  ('mehdi', 'reconnaissance', 'Incident de base de données de mardi résolu en 40 minutes, post-mortem publié le lendemain.', 'Je suis fière de la façon dont l''équipe a réagi grâce à ton organisation.', '', '', true, 5),
  ('sarah', 'reconnaissance', 'Tes sept tests utilisateurs ont fait ressortir le problème de navigation du planning mobile.', 'C''est ce qui a permis de le corriger avant la 3.0.', '', '', true, 18),
  ('yanis', 'amelioration', 'La version 2.9 est partie sans les notes de version pour le support.', 'Le support a reçu des questions auxquelles il ne pouvait pas répondre.', 'Peux-tu ajouter les notes de version à ta checklist de publication ?', 'Le support pourra répondre aux clients dès le premier jour.', true, 33)
) as f(who, kind, d, e, s, c, shared, ago);

-- ─── Trames d'entretien ─────────────────────────────────────────────────
insert into public.review_templates (id, team_id, kind, name, description, is_default) values
  ('55555555-0000-4000-8000-000000000101', '22222222-0000-4000-8000-000000000002', 'one_to_one', '1 à 1 hebdomadaire', '30 minutes, sans ordinateur : 10 minutes pour le collaborateur, 10 pour le manager, 10 pour le développement.', true),
  ('55555555-0000-4000-8000-000000000102', '22222222-0000-4000-8000-000000000002', 'annuel', 'Entretien annuel d''évaluation', 'Bilan de l''année écoulée et objectifs de l''année suivante.', true),
  ('55555555-0000-4000-8000-000000000103', '22222222-0000-4000-8000-000000000002', 'professionnel', 'Entretien professionnel', 'Obligatoire tous les deux ans (article L6315-1 du Code du travail). Porte sur les perspectives d''évolution, pas sur la performance.', true);

insert into public.template_questions (template_id, position, section, label, help, type, options) values
  ('55555555-0000-4000-8000-000000000101', 1, '1 · Le collaborateur (10 min)', 'Comment vas-tu ?', 'Côté manager : écouter, prendre des notes, ne pas résoudre.', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000101', 2, '1 · Le collaborateur (10 min)', 'Je t''écoute : de quoi veux-tu qu''on parle aujourd''hui ?', 'Pas de problème particulier ? L''ambiance dans l''équipe ? Tes projets ?', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000101', 3, '1 · Le collaborateur (10 min)', 'Ta charge de travail en ce moment', '1 : très légère · 3 : adaptée · 5 : excessive', 'echelle', '[]'),
  ('55555555-0000-4000-8000-000000000101', 4, '2 · Le manager (10 min)', 'Questions et informations à partager', 'Ce que le manager veut transmettre (vie de l''entreprise, décisions, réponses attendues).', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000101', 5, '2 · Le manager (10 min)', 'Feedback : reconnaissance ou ajustement', 'Quand tu… · Voilà ce qui se passe… · Peux-tu… ?', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000101', 6, '3 · Le développement (10 min)', 'Note d''autonomie sur tes missions', '1 : besoin d''être guidé · 5 : totalement autonome', 'echelle', '[]'),
  ('55555555-0000-4000-8000-000000000101', 7, '3 · Le développement (10 min)', 'Délégation et coaching : étape franchie cette semaine', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000101', 8, '3 · Le développement (10 min)', 'Tes objectifs : où en es-tu ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 1, 'Bilan', 'Quel bilan faites-vous de votre année ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 2, 'Bilan', 'Dans quelle mesure vos objectifs ont-ils été atteints ?', '1 : pas atteints · 5 : dépassés', 'echelle', '[]'),
  ('55555555-0000-4000-8000-000000000102', 3, 'Compétences', 'Quelles compétences avez-vous le plus mobilisées ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 4, 'Compétences', 'Points forts', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 5, 'Compétences', 'Axes de progrès', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 6, 'Perspectives', 'Objectifs proposés pour l''année prochaine', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000102', 7, 'Perspectives', 'Souhaits d''évolution', '', 'choix', '["Rester sur le poste actuel", "Prendre plus de responsabilités", "Changer de métier dans l''entreprise", "Mobilité géographique"]'),
  ('55555555-0000-4000-8000-000000000102', 8, 'Perspectives', 'Souhaitez-vous suivre une formation l''an prochain ?', '', 'oui_non', '[]'),
  ('55555555-0000-4000-8000-000000000103', 1, 'Parcours', 'Votre parcours depuis le dernier entretien professionnel', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000103', 2, 'Parcours', 'Formations suivies', 'Intitulé, organisme et année', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000103', 3, 'Projet', 'Votre projet professionnel à 2 ou 3 ans', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000103', 4, 'Projet', 'Besoins en formation', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000103', 5, 'Projet', 'Mobilité souhaitée', '', 'choix', '["Aucune", "Interne, autre équipe", "Interne, autre site", "Externe"]'),
  ('55555555-0000-4000-8000-000000000103', 6, 'Projet', 'Avez-vous suivi au moins une formation non obligatoire ces deux dernières années ?', '', 'oui_non', '[]');

create function pg_temp.questions(tpl uuid) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('key', 'q' || position, 'section', section, 'label', label, 'help', help, 'type', type, 'options', options) order by position)
  from public.template_questions where template_id = tpl
$$;
create function pg_temp.tpl(k public.review_kind) returns uuid language sql as $$
  select case k when 'one_to_one' then '55555555-0000-4000-8000-000000000101'::uuid
    when 'annuel' then '55555555-0000-4000-8000-000000000102'::uuid else '55555555-0000-4000-8000-000000000103'::uuid end
$$;

-- ─── Entretiens ─────────────────────────────────────────────────────────
create temp table seed_reviews (id uuid, key text, kind public.review_kind, d int, t text, state text, summary text, priority text);
insert into seed_reviews values
  -- derniers 1 à 1 (clos et signés)
  ('66666666-0000-4000-8000-000000000101', 'ines',     'one_to_one', -7,  '10:00', 'signe', 'Design system : 31 composants sur 40. Charge forte en fin de sprint, on retire la refonte de la page d''accueil de son périmètre.', 'Terminer les composants de formulaire avant la 3.0'),
  ('66666666-0000-4000-8000-000000000102', 'yanis',    'one_to_one', -8,  '14:00', 'signe', 'Publication 3.0 en bonne voie. Notes de version intégrées à la checklist.', 'Version bêta sur TestFlight vendredi'),
  ('66666666-0000-4000-8000-000000000103', 'lucas',    'one_to_one', -6,  '11:00', 'signe', 'Première démo réussie. Écrire les tests avant le code sur la prochaine tâche.', '10 tests écrits avant le code d''ici le prochain 1 à 1'),
  ('66666666-0000-4000-8000-000000000104', 'mehdi',    'one_to_one', -9,  '09:30', 'signe', 'Temps de déploiement à 18 min. Il pilote l''astreinte en autonomie.', 'Publier le planning d''astreinte de janvier'),
  ('66666666-0000-4000-8000-000000000105', 'amandine', 'one_to_one', -13, '15:00', 'signe', '52 % de la recette automatisée. Souhaite former Lucas.', 'Binôme hebdomadaire avec Lucas'),
  ('66666666-0000-4000-8000-000000000106', 'hugo',     'one_to_one', -24, '16:00', 'signe', 'Synchro : 2 modules migrés sur 5. Hugo motivé par la nouvelle architecture, quelques inquiétudes sur le délai.', 'Livrer le module « agenda partagé » d''ici deux semaines'),
  ('66666666-0000-4000-8000-000000000107', 'sarah',    'one_to_one', -16, '10:30', 'signe', 'Sept tests utilisateurs menés. Restitution prévue en revue de sprint.', 'Restituer les tests à l''équipe'),
  -- plus anciens
  ('66666666-0000-4000-8000-000000000111', 'hugo',     'one_to_one', -38, '16:00', 'signe', 'Étude de la nouvelle synchro présentée au comité technique, très bien reçue.', 'Démarrer la migration module par module'),
  ('66666666-0000-4000-8000-000000000112', 'ines',     'one_to_one', -21, '10:00', 'signe', 'Lancement de la guilde front-end.', ''),
  -- annuels et professionnels
  ('66666666-0000-4000-8000-000000000121', 'hugo',     'annuel', -357, '10:30', 'signe', 'Développeur moteur, référent technique de l''équipe. Axe : partager davantage ses connaissances.', ''),
  ('66666666-0000-4000-8000-000000000122', 'mehdi',    'annuel', -342, '14:00', 'signe', 'Fiabilité de la production nettement améliorée.', ''),
  ('66666666-0000-4000-8000-000000000123', 'ines',     'annuel', -300, '10:00', 'signe', 'Très belle année, montée en compétences sur l''accessibilité.', ''),
  ('66666666-0000-4000-8000-000000000124', 'amandine', 'annuel', -296, '15:00', 'signe', 'Recette fiabilisée, démarche d''automatisation lancée.', ''),
  ('66666666-0000-4000-8000-000000000125', 'yanis',    'annuel', -280, '09:00', 'signe', 'Bonne prise en main du mobile.', ''),
  ('66666666-0000-4000-8000-000000000126', 'sarah',    'annuel', -250, '14:00', 'signe', 'Intégration réussie, recherche utilisateur structurée.', ''),
  ('66666666-0000-4000-8000-000000000131', 'mehdi',    'professionnel', -712, '14:00', 'signe', 'Souhaite évoluer vers un rôle d''architecte infrastructure.', ''),
  ('66666666-0000-4000-8000-000000000132', 'hugo',     'professionnel', -455, '10:00', 'signe', 'Intérêt pour un rôle de lead technique.', ''),
  ('66666666-0000-4000-8000-000000000133', 'yanis',    'professionnel', -300, '11:00', 'signe', 'Souhaite se spécialiser sur l''accessibilité mobile.', ''),
  ('66666666-0000-4000-8000-000000000134', 'ines',     'professionnel', -410, '10:00', 'signe', 'Projet : animer la communauté front de l''entreprise.', ''),
  ('66666666-0000-4000-8000-000000000135', 'sarah',    'professionnel', -230, '14:00', 'signe', 'Premier entretien professionnel après l''intégration.', ''),
  ('66666666-0000-4000-8000-000000000136', 'amandine', 'professionnel', -520, '15:00', 'signe', 'Intérêt pour une certification en automatisation des tests.', ''),
  ('66666666-0000-4000-8000-000000000127', 'lucas',    'annuel', -40, '11:00', 'signe', 'Bilan de la première année d''alternance : progression nette, besoin de cadre sur les tests.', ''),
  -- clos, pas encore signé par le collaborateur
  ('66666666-0000-4000-8000-000000000108', 'amandine', 'one_to_one', -2, '15:00', 'clos', 'Binôme avec Lucas en place. Outil de test : licence validée.', 'Automatiser le parcours de réservation'),
  -- à venir
  ('66666666-0000-4000-8000-000000000141', 'mehdi',    'one_to_one', 1,  '09:30', 'prep_manager', '', ''),
  ('66666666-0000-4000-8000-000000000142', 'ines',     'one_to_one', 2,  '10:00', 'a_preparer', '', ''),
  ('66666666-0000-4000-8000-000000000143', 'yanis',    'one_to_one', 5,  '14:00', 'pret', '', ''),
  ('66666666-0000-4000-8000-000000000144', 'hugo',     'annuel',     8,  '14:00', 'prep_collab', '', ''),
  ('66666666-0000-4000-8000-000000000145', 'hugo',     'one_to_one', 1,  '16:00', 'a_preparer', '', ''),
  ('66666666-0000-4000-8000-000000000146', 'sarah',    'one_to_one', 6,  '10:30', 'a_preparer', '', '');

insert into public.reviews (id, team_id, collaborator_id, manager_id, kind, template_id, questions, scheduled_at, duration_minutes, location, status,
  collaborator_prepared_at, manager_prepared_at, summary, priority, reformulated_at, live_notes, completed_at, collaborator_signed_at, manager_signed_at, created_at)
select r.id, '22222222-0000-4000-8000-000000000002', pg_temp.p(r.key), pg_temp.p('camille'), r.kind, pg_temp.tpl(r.kind), pg_temp.questions(pg_temp.tpl(r.kind)),
  pg_temp.ts(current_date + r.d, r.t),
  case r.kind when 'one_to_one' then 30 else 90 end,
  case r.kind when 'one_to_one' then 'Salle Orion, porte fermée' else 'Salle Andromède' end,
  case when r.state in ('signe', 'clos') then 'termine' else 'planifie' end::public.review_status,
  case when r.state in ('signe', 'clos', 'pret', 'prep_collab') then pg_temp.ts(current_date + least(r.d, 0) - 3, '18:00') end,
  case when r.state in ('signe', 'clos', 'pret', 'prep_manager') then pg_temp.ts(current_date + least(r.d, 0) - 1, '19:00') end,
  r.summary, r.priority,
  case when r.state in ('signe', 'clos') and r.kind = 'one_to_one' then pg_temp.ts(current_date + r.d, r.t) + interval '28 minutes' end,
  '',
  case when r.state in ('signe', 'clos') then pg_temp.ts(current_date + r.d, r.t) + interval '30 minutes' end,
  case when r.state = 'signe' then pg_temp.ts(current_date + r.d + 1, '09:12') end,
  case when r.state in ('signe', 'clos') then pg_temp.ts(current_date + r.d, r.t) + interval '40 minutes' end,
  pg_temp.ts(current_date + least(r.d, 0) - 14, '08:00')
from seed_reviews r;

update public.reviews set live_notes = E'Partie 1 : fatiguée par la fin de sprint, contente de la guilde.\nPartie 2 : on retire la refonte de la page d''accueil de son périmètre.\nPartie 3 : autonomie 4/5 sur le design system.'
  where id = '66666666-0000-4000-8000-000000000101';
update public.reviews set live_notes = E'Partie 1 : enthousiaste sur la nouvelle architecture, inquiet sur le délai du gel.\nPartie 2 : rappel de l''importance du module agenda pour la démo client.\nPartie 3 : autonomie 5/5, souhaite plus de responsabilités techniques.'
  where id = '66666666-0000-4000-8000-000000000106';

insert into public.review_answers (review_id, question_key, author, value) values
  ('66666666-0000-4000-8000-000000000101', 'q1', 'collaborateur', '"Plutôt bien, un peu fatiguée par la fin de sprint."'),
  ('66666666-0000-4000-8000-000000000101', 'q2', 'collaborateur', '"La guilde front et la charge de fin de sprint."'),
  ('66666666-0000-4000-8000-000000000101', 'q3', 'collaborateur', '4'),
  ('66666666-0000-4000-8000-000000000101', 'q4', 'manager', '"Arbitrage : la refonte de la page d''accueil passe au trimestre prochain."'),
  ('66666666-0000-4000-8000-000000000101', 'q5', 'manager', '"Reconnaissance : l''aide apportée à Lucas mardi."'),
  ('66666666-0000-4000-8000-000000000101', 'q6', 'collaborateur', '4'),
  ('66666666-0000-4000-8000-000000000101', 'q6', 'manager', '4'),
  ('66666666-0000-4000-8000-000000000106', 'q1', 'collaborateur', '"Bien, motivé par la nouvelle architecture."'),
  ('66666666-0000-4000-8000-000000000106', 'q2', 'collaborateur', '"Le délai de la migration avant le gel de fin d''année."'),
  ('66666666-0000-4000-8000-000000000106', 'q3', 'collaborateur', '3'),
  ('66666666-0000-4000-8000-000000000106', 'q6', 'collaborateur', '5'),
  ('66666666-0000-4000-8000-000000000106', 'q6', 'manager', '5'),
  ('66666666-0000-4000-8000-000000000141', 'q4', 'manager', '"Budget runners CI validé par la direction."'),
  ('66666666-0000-4000-8000-000000000141', 'q5', 'manager', '"Reconnaissance : la gestion de l''incident de mardi."'),
  ('66666666-0000-4000-8000-000000000143', 'q1', 'collaborateur', '"Bien, la bêta est prête."'),
  ('66666666-0000-4000-8000-000000000143', 'q2', 'collaborateur', '"La date de publication sur les stores."'),
  ('66666666-0000-4000-8000-000000000143', 'q3', 'collaborateur', '3'),
  ('66666666-0000-4000-8000-000000000143', 'q4', 'manager', '"Date de publication validée avec le marketing."'),
  ('66666666-0000-4000-8000-000000000143', 'q5', 'manager', '"Recadrage DESC : les interruptions au daily."'),
  ('66666666-0000-4000-8000-000000000144', 'q1', 'collaborateur', '"Une année riche avec l''étude puis la migration de la synchronisation."'),
  ('66666666-0000-4000-8000-000000000144', 'q2', 'collaborateur', '3'),
  ('66666666-0000-4000-8000-000000000144', 'q3', 'collaborateur', '"Architecture, Node.js, PostgreSQL."'),
  ('66666666-0000-4000-8000-000000000144', 'q7', 'collaborateur', '"Prendre plus de responsabilités"'),
  ('66666666-0000-4000-8000-000000000144', 'q8', 'collaborateur', 'true');

-- Engagements pris en fin de 1 à 1 (collaborateur et manager).
insert into public.review_actions (review_id, title, owner_id, due_date, status, done_at, created_at) values
  ('66666666-0000-4000-8000-000000000101', 'Terminer les composants de formulaire du design system', pg_temp.p('ines'), current_date + 9, 'en_cours', null, now() - interval '7 days'),
  ('66666666-0000-4000-8000-000000000101', 'Annoncer au produit le report de la refonte de la page d''accueil', pg_temp.p('camille'), current_date - 4, 'fait', now() - interval '5 days', now() - interval '7 days'),
  ('66666666-0000-4000-8000-000000000102', 'Publier la bêta sur TestFlight', pg_temp.p('yanis'), current_date + 3, 'en_cours', null, now() - interval '8 days'),
  ('66666666-0000-4000-8000-000000000103', 'Écrire les tests avant le code sur la prochaine tâche', pg_temp.p('lucas'), current_date + 8, 'en_cours', null, now() - interval '6 days'),
  ('66666666-0000-4000-8000-000000000104', 'Publier le planning d''astreinte de janvier', pg_temp.p('mehdi'), current_date + 12, 'a_faire', null, now() - interval '9 days'),
  ('66666666-0000-4000-8000-000000000106', 'Livrer le module « agenda partagé »', pg_temp.p('hugo'), current_date - 9, 'en_cours', null, now() - interval '24 days'),
  ('66666666-0000-4000-8000-000000000106', 'Bloquer une journée sans réunion par semaine pour Hugo', pg_temp.p('camille'), current_date - 20, 'fait', now() - interval '21 days', now() - interval '24 days'),
  ('66666666-0000-4000-8000-000000000108', 'Automatiser le parcours de réservation', pg_temp.p('amandine'), current_date + 14, 'a_faire', null, now() - interval '2 days');

-- ─── Demande de 1 à 1 ───────────────────────────────────────────────────
insert into public.review_requests (team_id, collaborator_id, message, preferred_date, created_at) values
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('lucas'), 'J''aimerais faire le point sur la suite de mon alternance et les sujets que je pourrais prendre.', current_date + 3, now() - interval '1 day');

-- ─── Tâches (Hugo : deux échéances manquées) ────────────────────────────
create temp table seed_tasks (code text, title text, who text, prio public.task_priority, status public.task_status, due int, descr text);
insert into seed_tasks values
  ('SYNC', 'Migrer le module « calendriers externes »', 'hugo', 'haute', 'termine', -30, ''),
  ('SYNC', 'Livrer le module « agenda partagé »', 'hugo', 'urgente', 'en_cours', -9, 'Promis pour la démo client du 15.'),
  ('SYNC', 'Corriger l''export iCal', 'hugo', 'haute', 'a_faire', -3, 'Signalé par trois clients au support.'),
  ('SYNC', 'Migrer le module « disponibilités »', 'hugo', 'normale', 'a_faire', 14, ''),
  ('MOB', 'Publier la bêta 3.0 sur TestFlight', 'yanis', 'haute', 'en_cours', 3, ''),
  ('MOB', 'Corriger le plantage au changement de fuseau horaire', 'yanis', 'urgente', 'en_validation', 1, ''),
  ('MOB', 'Restituer les tests utilisateurs du planning mobile', 'sarah', 'normale', 'a_faire', 5, ''),
  ('MOB', 'Maquetter le nouvel écran de réservation', 'sarah', 'normale', 'en_cours', 8, ''),
  ('API', 'Documenter les points d''API « réservations »', 'ines', 'normale', 'en_cours', 6, ''),
  ('API', 'Composants de formulaire du design system', 'ines', 'haute', 'en_cours', 9, ''),
  ('API', 'Écrire les tests du point d''API « créneaux »', 'lucas', 'normale', 'en_cours', 4, ''),
  ('API', 'Rédiger le guide d''onboarding développeur', 'lucas', 'basse', 'a_faire', 18, ''),
  ('RUN', 'Publier le planning d''astreinte de janvier', 'mehdi', 'haute', 'a_faire', 12, ''),
  ('RUN', 'Migrer la CI vers les nouveaux runners', 'mehdi', 'normale', 'en_cours', 10, ''),
  ('RUN', 'Post-mortem de l''incident base de données', 'mehdi', 'normale', 'termine', -4, ''),
  ('INT', 'Automatiser le parcours de réservation', 'amandine', 'haute', 'a_faire', 14, ''),
  ('INT', 'Revue de la stratégie de tests de la 3.0', 'amandine', 'normale', 'en_validation', -1, '');
insert into public.tasks (team_id, project_id, title, description, assignee_id, priority, status, due_date, position, created_by, created_at)
select '22222222-0000-4000-8000-000000000002', p.id, t.title, t.descr, pg_temp.p(t.who), t.prio, t.status, current_date + t.due,
  row_number() over (partition by t.status order by t.due), pg_temp.p('camille'), now() - ((30 - t.due / 2) || ' days')::interval
from seed_tasks t join public.projects p on p.code = t.code and p.team_id = '22222222-0000-4000-8000-000000000002';

-- ─── Délégation : domaines et missions confiées ─────────────────────────
create temp table seed_domains (pos int, name text, descr text);
insert into seed_domains values
  (1, 'Choix techniques dans son périmètre', 'Bibliothèques, conception d''un module'),
  (2, 'Mise en production', 'Déployer et revenir en arrière'),
  (3, 'Réponse aux clients (support niveau 2)', ''),
  (4, 'Priorisation dans le sprint', 'Ordre des tickets engagés'),
  (5, 'Achats d''outils < 500 €', 'Licences, extensions'),
  (6, 'Entretiens techniques de recrutement', '');
insert into public.delegation_domains (team_id, name, description, position)
select '22222222-0000-4000-8000-000000000002', name, descr, pos from seed_domains;

create temp table seed_deleg (key text, levels text[]);
insert into seed_deleg values
  ('hugo',     '{decide,decide,decide,decide,propose,decide}'),
  ('ines',     '{decide,propose,execute,propose,propose,propose}'),
  ('lucas',    '{execute,execute,execute,execute,execute,execute}'),
  ('amandine', '{propose,propose,decide,propose,propose,execute}'),
  ('yanis',    '{decide,propose,propose,propose,propose,execute}'),
  ('mehdi',    '{decide,decide,decide,propose,decide,propose}'),
  ('sarah',    '{propose,execute,propose,propose,propose,execute}');
insert into public.delegations (collaborator_id, domain_id, level)
select pg_temp.p(d.key), dd.id, d.levels[sd.pos]::public.delegation_level
from seed_deleg d cross join seed_domains sd
join public.delegation_domains dd on dd.name = sd.name and dd.team_id = '22222222-0000-4000-8000-000000000002';

insert into public.delegation_missions (team_id, collaborator_id, title, expected_result, limits, support, checkpoints, due_date, autonomy, status, debrief, created_by, created_at) values
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('mehdi'), 'Piloter l''astreinte de production', 'Planning d''astreinte publié chaque mois et respecté, incidents documentés.', 'Décide seul des retours arrière. Me prévient si un incident dure plus de 2 h.', 'Je défends le budget runners CI auprès de la direction.', 'Point chaque lundi au 1 à 1', current_date + 30, 4, 'en_cours', '', pg_temp.p('camille'), now() - interval '40 days'),
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('ines'), 'Animer la guilde front-end', 'Une session par sprint, compte rendu partagé aux trois équipes.', 'Choisit les sujets ; les décisions d''architecture transverses restent validées en comité technique.', 'Une demi-journée par sprint réservée.', 'Bilan à la fin de chaque sprint', current_date + 45, 3, 'en_cours', '', pg_temp.p('camille'), now() - interval '21 days'),
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('lucas'), 'Rédiger le guide d''onboarding développeur', 'Un nouvel arrivant installe son poste seul en moins d''une journée.', 'Me soumet le plan avant de rédiger.', 'Relecture par Inès ; binôme avec Amandine pour les tests.', 'Plan validé, puis relecture à mi-parcours', current_date + 18, 2, 'en_cours', '', pg_temp.p('camille'), now() - interval '10 days'),
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('hugo'), 'Étude de la nouvelle synchronisation', 'Étude présentée au comité technique avec un plan de migration.', 'Libre sur la solution ; budget cloud à valider avec moi.', 'Accès aux données de production anonymisées.', 'Point hebdomadaire', current_date - 45, 5, 'terminee', 'Étude remarquable, adoptée telle quelle par le comité technique.', pg_temp.p('camille'), now() - interval '90 days');

-- ─── Aide à la décision : un exemple déjà tranché ───────────────────────
insert into public.posture_notes (team_id, collaborator_id, situation, diagnosis, scarf, decision, next_step, created_by, created_at) values
  ('22222222-0000-4000-8000-000000000002', pg_temp.p('yanis'), 'Interruptions répétées de Lucas pendant les dailys (lundi et mercredi).', 'comprendre',
    '{"statut": -1, "certitude": 0, "autonomie": 0, "relations": -1, "equite": 0}',
    'Recadrage DESC en privé au prochain 1 à 1. Profil I : commencer par la relation, parler équipe dans les conséquences, ne pas le faire devant les autres.',
    'feedback', pg_temp.p('camille'), now() - interval '2 days');

-- ─── Pouls du jour (historique de démonstration) ────────────────────────
select public.generate_demo_pulses('22222222-0000-4000-8000-000000000002');

-- ===== 20261113090000_avatars.sql =====
-- Connect Team — avatar personnalisé : chacun compose son personnage (teint, coiffure, yeux,
-- bouche, accessoire, couleurs). Visible par toutes les personnes qui voient déjà sa fiche.

alter table public.profiles
  add column avatar jsonb check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 512));

-- La RLS de profiles ne permet qu'au manager de modifier une fiche : chacun passe par cette
-- fonction pour changer son propre avatar, et uniquement lui.
create function public.set_my_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  limits constant jsonb := '{"skin": 6, "hair": 6, "hairColor": 7, "eyes": 4, "mouth": 4, "accessory": 4, "shirt": 6, "bg": 6}';
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_avatar is not null then
    if jsonb_typeof(p_avatar) <> 'object' or (select count(*) from jsonb_object_keys(p_avatar)) <> 8 then
      raise exception 'Avatar invalide.' using errcode = '22023';
    end if;
    for k in select jsonb_object_keys(limits) loop
      if jsonb_typeof(p_avatar -> k) <> 'number'
         or (p_avatar ->> k)::numeric <> floor((p_avatar ->> k)::numeric)
         or (p_avatar ->> k)::int < 0 or (p_avatar ->> k)::int >= (limits ->> k)::int then
        raise exception 'Avatar invalide.' using errcode = '22023';
      end if;
    end loop;
  end if;
  update public.profiles set avatar = p_avatar where id = auth.uid();
end $$;
revoke execute on function public.set_my_avatar(jsonb) from public, anon;
grant execute on function public.set_my_avatar(jsonb) to authenticated, service_role;

-- Équipe modèle (personnes fictives) : un avatar pour chacun.
update public.profiles p set avatar = a.avatar::jsonb
from (values
  ('11111111-0000-4000-8000-000000000101', '{"skin": 1, "hair": 4, "hairColor": 1, "eyes": 1, "mouth": 0, "accessory": 1, "shirt": 0, "bg": 0}'),
  ('11111111-0000-4000-8000-000000000102', '{"skin": 0, "hair": 2, "hairColor": 3, "eyes": 0, "mouth": 2, "accessory": 2, "shirt": 5, "bg": 4}'),
  ('11111111-0000-4000-8000-000000000103', '{"skin": 2, "hair": 3, "hairColor": 0, "eyes": 1, "mouth": 1, "accessory": 0, "shirt": 3, "bg": 3}'),
  ('11111111-0000-4000-8000-000000000104', '{"skin": 1, "hair": 1, "hairColor": 2, "eyes": 0, "mouth": 0, "accessory": 3, "shirt": 2, "bg": 2}'),
  ('11111111-0000-4000-8000-000000000105', '{"skin": 0, "hair": 3, "hairColor": 4, "eyes": 2, "mouth": 0, "accessory": 1, "shirt": 1, "bg": 1}'),
  ('11111111-0000-4000-8000-000000000106', '{"skin": 4, "hair": 5, "hairColor": 0, "eyes": 3, "mouth": 1, "accessory": 0, "shirt": 4, "bg": 5}'),
  ('11111111-0000-4000-8000-000000000107', '{"skin": 3, "hair": 1, "hairColor": 0, "eyes": 0, "mouth": 0, "accessory": 0, "shirt": 1, "bg": 4}'),
  ('11111111-0000-4000-8000-000000000108', '{"skin": 1, "hair": 4, "hairColor": 0, "eyes": 1, "mouth": 1, "accessory": 0, "shirt": 3, "bg": 2}')
) as a(id, avatar)
where p.id = a.id::uuid;

-- Comptes de démonstration déjà copiés depuis l'équipe modèle : même avatar que leur modèle.
update public.profiles p set avatar = t.avatar
from public.profiles t, public.demo_accounts d
where d.user_id = p.id and p.avatar is null and t.team_id = '22222222-0000-4000-8000-000000000002'
  and t.first_name = p.first_name and t.last_name = p.last_name;

-- Les prochaines équipes copient aussi l'avatar des collaborateurs fictifs.
do $$
declare
  v_def text := pg_get_functiondef('public.provision_manager_team(uuid, text, text, text, text, text, text, jsonb, text)'::regprocedure);
begin
  v_def := replace(v_def, 'job_title, hired_on, is_active)', 'job_title, hired_on, is_active, avatar)');
  v_def := replace(v_def, 'p.hired_on, p.is_active', 'p.hired_on, p.is_active, p.avatar');
  execute v_def;
end $$;

-- « Préparer mon 1 à 1 » : exemple de préparation rapide déjà envoyée (Yanis, équipe modèle).
insert into public.review_answers (review_id, question_key, author, value) values
  ('66666666-0000-4000-8000-000000000143', 'mes_sujets', 'collaborateur', '"Mes projets · Mon évolution"'),
  ('66666666-0000-4000-8000-000000000143', 'ca_va', 'collaborateur', '"La bêta 3.0 est prête et les premiers retours sont bons."'),
  ('66666666-0000-4000-8000-000000000143', 'ca_coince', 'collaborateur', '"J''ai l''impression qu''on me reproche d''aller trop vite en daily."')
on conflict (review_id, question_key, author) do nothing;

-- ===== 20261114090000_avatars_3d.sql =====
-- Connect Team — personnages 3D : un avatar peut désormais être {"preset": "<personnage>"}
-- (portraits dans public/avatars), en plus du personnage composé pièce par pièce.

create or replace function public.set_my_avatar(p_avatar jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  limits constant jsonb := '{"skin": 6, "hair": 6, "hairColor": 7, "eyes": 4, "mouth": 4, "accessory": 4, "shirt": 6, "bg": 6}';
  presets constant text[] := array['alex', 'theo', 'lea', 'noah', 'jade'];
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_avatar is not null then
    if jsonb_typeof(p_avatar) <> 'object' then
      raise exception 'Avatar invalide.' using errcode = '22023';
    end if;
    if p_avatar ? 'preset' then
      if (select count(*) from jsonb_object_keys(p_avatar)) <> 1 or not ((p_avatar ->> 'preset') = any (presets)) then
        raise exception 'Avatar invalide.' using errcode = '22023';
      end if;
    else
      if (select count(*) from jsonb_object_keys(p_avatar)) <> 8 then
        raise exception 'Avatar invalide.' using errcode = '22023';
      end if;
      for k in select jsonb_object_keys(limits) loop
        if jsonb_typeof(p_avatar -> k) <> 'number'
           or (p_avatar ->> k)::numeric <> floor((p_avatar ->> k)::numeric)
           or (p_avatar ->> k)::int < 0 or (p_avatar ->> k)::int >= (limits ->> k)::int then
          raise exception 'Avatar invalide.' using errcode = '22023';
        end if;
      end loop;
    end if;
  end if;
  update public.profiles set avatar = p_avatar where id = auth.uid();
end $$;
revoke execute on function public.set_my_avatar(jsonb) from public, anon;
grant execute on function public.set_my_avatar(jsonb) to authenticated, service_role;

-- Équipe modèle : cinq personnes passent en personnage 3D (les autres gardent leur personnage composé).
update public.profiles p set avatar = jsonb_build_object('preset', a.preset)
from (values
  ('11111111-0000-4000-8000-000000000101', 'lea'),
  ('11111111-0000-4000-8000-000000000102', 'alex'),
  ('11111111-0000-4000-8000-000000000105', 'jade'),
  ('11111111-0000-4000-8000-000000000106', 'theo'),
  ('11111111-0000-4000-8000-000000000107', 'noah')
) as a(id, preset)
where p.id = a.id::uuid;

-- Comptes de démonstration déjà copiés : même avatar que leur modèle.
update public.profiles p set avatar = t.avatar
from public.profiles t, public.demo_accounts d
where d.user_id = p.id and t.team_id = '22222222-0000-4000-8000-000000000002' and t.role = 'collaborateur'
  and t.first_name = p.first_name and t.last_name = p.last_name;

-- ===== seed.sql =====
-- Connect Team — le jeu de démonstration (Nébuleo, éditeur de logiciels, données fictives)
-- est créé par la migration 20261112090200_demo_nebuleo.sql, pour être identique en local
-- et en production. Ce fichier reste volontairement vide.
-- Mot de passe commun des comptes de démonstration : Cadence-Demo26!
select 1;
