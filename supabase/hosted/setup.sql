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

-- ===== seed.sql =====
-- Cadence — jeu de démonstration (Valmont Équipements, PME de machines spéciales).
-- Dates relatives à current_date : le jeu reste crédible quel que soit le jour du lancement.
-- Mot de passe commun des comptes de démonstration : Cadence-Demo26!

create function pg_temp.ts(d date, t text) returns timestamptz language sql as $$
  select (d + t::time) at time zone 'Europe/Paris'
$$;
-- Bruit déterministe entre 0 et n-1.
create function pg_temp.noise(seed text, n int) returns int language sql as $$
  select abs(hashtext(seed)) % n
$$;

create temp table seed_people (key text primary key, id uuid, first_name text, last_name text, email text, job text, hired date, role public.app_role);
insert into seed_people values
  ('claire',   '11111111-0000-4000-8000-000000000001', 'Claire',   'Vasseur',  'claire.vasseur@valmont-equipements.fr',   'Responsable des opérations', '2012-09-03', 'manager'),
  ('karim',    '11111111-0000-4000-8000-000000000002', 'Karim',    'Benali',   'karim.benali@valmont-equipements.fr',     'Chargé d''affaires', '2019-03-04', 'collaborateur'),
  ('elodie',   '11111111-0000-4000-8000-000000000003', 'Élodie',   'Fontaine', 'elodie.fontaine@valmont-equipements.fr',  'Assistante ADV', '2021-09-13', 'collaborateur'),
  ('thomas',   '11111111-0000-4000-8000-000000000004', 'Thomas',   'Girard',   'thomas.girard@valmont-equipements.fr',    'Responsable atelier', '2014-01-06', 'collaborateur'),
  ('nadia',    '11111111-0000-4000-8000-000000000005', 'Nadia',    'Haddad',   'nadia.haddad@valmont-equipements.fr',     'Technicienne de mise en service', '2020-06-02', 'collaborateur'),
  ('julien',   '11111111-0000-4000-8000-000000000006', 'Julien',   'Mercier',  'julien.mercier@valmont-equipements.fr',   'Technicien SAV', '2017-10-16', 'collaborateur'),
  ('mathilde', '11111111-0000-4000-8000-000000000007', 'Mathilde', 'Roux',     'mathilde.roux@valmont-equipements.fr',    'Technicienne méthodes', '2023-02-27', 'collaborateur'),
  ('bastien',  '11111111-0000-4000-8000-000000000008', 'Bastien',  'Le Gall',  'bastien.legall@valmont-equipements.fr',   'Technicien de maintenance itinérant', '2022-05-09', 'collaborateur');

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

insert into public.teams (id, name, company) values ('22222222-0000-4000-8000-000000000001', 'Opérations et services', 'Valmont Équipements');
insert into public.team_settings (team_id) values ('22222222-0000-4000-8000-000000000001');

insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title, hired_on)
select id, '22222222-0000-4000-8000-000000000001', role, first_name, last_name, email, job, hired from seed_people;

-- ─── Notes privées du manager ───────────────────────────────────────────
insert into public.manager_notes (collaborator_id, author_id, body, created_at) values
  (pg_temp.p('julien'), pg_temp.p('claire'), 'Fatigue visible depuis la reprise du contrat Laiterie du Bocage (astreintes rapprochées). Proposer un roulement avec Bastien sur les astreintes de décembre.', now() - interval '6 days'),
  (pg_temp.p('nadia'), pg_temp.p('claire'), 'Candidate naturelle au poste de référente mise en service robotisée. En parler lors de l''entretien annuel, sans rien promettre avant le budget 2027.', now() - interval '24 days'),
  (pg_temp.p('elodie'), pg_temp.p('claire'), 'Charge sous-utilisée depuis le passage à la saisie EDI. Lui confier le suivi des avoirs clients ? Vérifier son intérêt d''abord.', now() - interval '15 days'),
  (pg_temp.p('thomas'), pg_temp.p('claire'), 'Tension avec l''équipe de nuit sur la répartition des heures supplémentaires. Point prévu avec les RH le mois prochain.', now() - interval '31 days'),
  (pg_temp.p('mathilde'), pg_temp.p('claire'), 'Très bonne intégration. Rigueur appréciée par le bureau d''études.', now() - interval '52 days');

-- ─── Journal des connexions ─────────────────────────────────────────────
insert into public.login_events (user_id, team_id, user_agent, created_at)
select sp.id, '22222222-0000-4000-8000-000000000001',
  (array['Edge 131 · Windows 11', 'Chrome 131 · Windows 10', 'Safari · iPadOS 18', 'Firefox 133 · Windows 11'])[1 + pg_temp.noise(sp.key || g::text, 4)],
  now() - (g * interval '19 hours') - (pg_temp.noise(sp.key || g::text, 300) * interval '1 minute')
from seed_people sp cross join generate_series(0, 5) g
where pg_temp.noise(sp.key || g::text || 'x', 3) > 0;

-- ─── Projets ────────────────────────────────────────────────────────────
insert into public.projects (id, team_id, code, name, client) values
  ('33333333-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'AFF-2611', 'Ligne d''embouteillage L3', 'Laiterie du Bocage'),
  ('33333333-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'AFF-2604', 'Rétrofit presse 400 t', 'Forges de l''Allier'),
  ('33333333-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'AFF-2615', 'Cellule robotisée de palettisation', 'Plasturgie des Ardennes'),
  ('33333333-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000001', 'AFF-2598', 'Convoyeur palettes zone B', 'Logistique Morvan'),
  ('33333333-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000001', 'SAV', 'Contrats de maintenance', 'Parc installé'),
  ('33333333-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000001', 'INT', 'Amélioration continue', 'Interne');

-- ─── Objectifs et résultats clés ────────────────────────────────────────
create temp table seed_obj (id uuid, owner text, title text, description text, s int, e int);
insert into seed_obj values
  ('44444444-0000-4000-8000-000000000001', null, 'Réduire le délai moyen de mise en service', 'Passer sous les 12 jours ouvrés entre la livraison et la réception client signée.', -150, 75),
  ('44444444-0000-4000-8000-000000000002', null, 'Fiabiliser le SAV sur le parc installé', 'Résoudre davantage de pannes dès la première intervention et sécuriser les renouvellements de contrats.', -120, 58),
  ('44444444-0000-4000-8000-000000000003', null, 'Sécuriser le carnet de commandes 2027', 'Atteindre 1,85 M€ de commandes signées avant la clôture de l''exercice.', -95, 52),
  ('44444444-0000-4000-8000-000000000011', 'karim', 'Développer le portefeuille agroalimentaire', 'Ouvrir de nouveaux comptes dans les laiteries et conserveries du Grand Ouest.', -100, 80),
  ('44444444-0000-4000-8000-000000000012', 'elodie', 'Fiabiliser la saisie des commandes clients', 'Moins d''erreurs de saisie et une confirmation de commande plus rapide.', -130, 18),
  ('44444444-0000-4000-8000-000000000013', 'thomas', 'Réorganiser l''atelier de câblage', 'Réaménager les postes pour réduire le temps de câblage par armoire.', -160, 40),
  ('44444444-0000-4000-8000-000000000014', 'nadia', 'Gagner en autonomie sur les mises en service robotisées', 'Mener seule les mises en service des cellules FANUC d''ici la fin du semestre.', -140, 90),
  ('44444444-0000-4000-8000-000000000015', 'julien', 'Réduire les retours SAV', 'Diminuer les interventions qui nécessitent un second passage sous 30 jours.', -150, -5),
  ('44444444-0000-4000-8000-000000000016', 'mathilde', 'Standardiser les gammes de fabrication', 'Gammes et nomenclatures standard pour les convoyeurs et tables élévatrices.', -60, 120),
  ('44444444-0000-4000-8000-000000000017', 'bastien', 'Déployer la maintenance préventive chez 10 clients', 'Plans de maintenance préventive signés et suivis avec rapport sous 48 h.', -110, 70);

insert into public.objectives (id, team_id, scope, owner_id, title, description, start_date, due_date, created_by, created_at)
select id, '22222222-0000-4000-8000-000000000001', case when owner is null then 'equipe' else 'individuel' end::public.objective_scope,
  case when owner is null then null else pg_temp.p(owner) end, title, description, current_date + s, current_date + e, pg_temp.p('claire'),
  (current_date + s)::timestamptz
from seed_obj;

insert into public.key_results (objective_id, title, unit, start_value, target_value, current_value, pending_value, pending_at, validated_at, position) values
  ('44444444-0000-4000-8000-000000000001', 'Délai moyen de mise en service', 'j', 18, 12, 14.5, null, null, now() - interval '9 days', 0),
  ('44444444-0000-4000-8000-000000000001', 'Mises en service sans réserve client', '%', 61, 90, 79, null, null, now() - interval '9 days', 1),
  ('44444444-0000-4000-8000-000000000002', 'Résolution au premier passage', '%', 64, 85, 72, null, null, now() - interval '14 days', 0),
  ('44444444-0000-4000-8000-000000000002', 'Contrats de maintenance renouvelés', 'contrats', 0, 24, 13, null, null, now() - interval '14 days', 1),
  ('44444444-0000-4000-8000-000000000003', 'Commandes signées', 'k€', 0, 1850, 1035, null, null, now() - interval '6 days', 0),
  ('44444444-0000-4000-8000-000000000003', 'Taux de transformation des devis', '%', 22, 30, 25.5, null, null, now() - interval '6 days', 1),
  ('44444444-0000-4000-8000-000000000011', 'Nouveaux comptes ouverts', 'comptes', 0, 6, 4, null, null, now() - interval '11 days', 0),
  ('44444444-0000-4000-8000-000000000011', 'Devis émis', 'devis', 0, 40, 29, 31, now() - interval '1 day', now() - interval '11 days', 1),
  ('44444444-0000-4000-8000-000000000012', 'Commandes saisies sans erreur', '%', 92, 99, 96.5, null, null, now() - interval '20 days', 0),
  ('44444444-0000-4000-8000-000000000012', 'Délai de confirmation de commande', 'h', 48, 24, 31, null, null, now() - interval '20 days', 1),
  ('44444444-0000-4000-8000-000000000013', 'Postes de câblage réaménagés', 'postes', 0, 5, 4, null, null, now() - interval '5 days', 0),
  ('44444444-0000-4000-8000-000000000013', 'Temps de câblage par armoire', 'h', 26, 21, 22.5, null, null, now() - interval '5 days', 1),
  ('44444444-0000-4000-8000-000000000014', 'Mises en service robot menées seule', 'chantiers', 0, 4, 2, 3, now() - interval '2 days', now() - interval '30 days', 0),
  ('44444444-0000-4000-8000-000000000014', 'Opérateurs clients formés sur cellule robotisée', 'opérateurs', 0, 12, 7, null, null, now() - interval '30 days', 1),
  ('44444444-0000-4000-8000-000000000015', 'Interventions avec retour sous 30 jours', '%', 14, 6, 9.6, null, null, now() - interval '18 days', 0),
  ('44444444-0000-4000-8000-000000000016', 'Gammes standardisées', 'gammes', 0, 35, 9, null, null, now() - interval '8 days', 0),
  ('44444444-0000-4000-8000-000000000016', 'Nomenclatures vérifiées', 'nomenclatures', 0, 120, 41, null, null, now() - interval '8 days', 1),
  ('44444444-0000-4000-8000-000000000017', 'Clients équipés d''un plan préventif', 'clients', 0, 10, 6, null, null, now() - interval '12 days', 0),
  ('44444444-0000-4000-8000-000000000017', 'Rapports d''intervention remis sous 48 h', '%', 55, 95, 88, null, null, now() - interval '12 days', 1);

-- Historique mensuel : progression irrégulière entre la valeur de départ et la valeur actuelle.
insert into public.key_result_history (key_result_id, value, recorded_at, recorded_by)
select k.id,
  round((k.start_value + (k.current_value - k.start_value)
    * least(1, greatest(0, ((m.d - o.start_date)::numeric / greatest(1, current_date - o.start_date))
      + (pg_temp.noise(k.id::text || m.d::text, 13) - 6) / 100.0)))::numeric, 1),
  pg_temp.ts(m.d, '17:30'), pg_temp.p('claire')
from public.key_results k
join public.objectives o on o.id = k.objective_id
cross join lateral (select (date_trunc('month', current_date) - (g || ' months')::interval + interval '14 days')::date as d from generate_series(0, 6) g) m
where m.d >= o.start_date and m.d < current_date;

-- ─── Compétences ────────────────────────────────────────────────────────
create temp table seed_skills (pos int, name text, category text);
insert into seed_skills values
  (1, 'Lecture de schémas électriques', 'Électrotechnique'), (2, 'Câblage d''armoires', 'Électrotechnique'),
  (3, 'Automates Siemens S7', 'Automatisme'), (4, 'Robotique FANUC', 'Automatisme'),
  (5, 'Diagnostic hydraulique', 'Mécanique'), (6, 'Soudure TIG', 'Mécanique'),
  (7, 'Analyse vibratoire', 'Maintenance'), (8, 'Habilitation électrique B2V/BR', 'Sécurité'),
  (9, 'Chiffrage d''affaires', 'Commercial'), (10, 'Commandes SAP SD', 'Administration des ventes'),
  (11, 'Rapports d''intervention', 'Qualité'), (12, 'Pilotage de mise en service', 'Projet');
insert into public.skills (team_id, name, category, created_at)
select '22222222-0000-4000-8000-000000000001', name, category, now() - interval '200 days' + pos * interval '1 minute' from seed_skills;

create temp table seed_levels (key text, levels int[]);
insert into seed_levels values
  ('karim',    '{2,0,0,0,0,0,0,1,4,2,2,3}'), ('elodie',  '{1,0,0,0,0,0,0,0,2,4,2,1}'),
  ('thomas',   '{4,4,2,1,3,4,1,3,2,0,3,2}'), ('nadia',   '{4,3,4,3,2,0,1,4,1,0,3,4}'),
  ('julien',   '{3,2,2,0,4,1,2,4,0,0,3,2}'), ('mathilde','{3,2,1,0,2,1,0,2,1,2,4,1}'),
  ('bastien',  '{3,2,1,0,3,1,4,4,0,0,2,1}');
insert into public.skill_levels (collaborator_id, skill_id, self_level, manager_level, validated_at)
select pg_temp.p(l.key), s.id,
  least(4, greatest(1, l.levels[ss.pos] + case pg_temp.noise(l.key || ss.pos, 7) when 0 then 1 when 1 then -1 else 0 end)),
  l.levels[ss.pos], now() - interval '40 days'
from seed_levels l
join seed_skills ss on l.levels[ss.pos] > 0
join public.skills s on s.name = ss.name;
-- Auto-évaluations récentes en attente de validation.
update public.skill_levels set self_level = 4, validated_at = null
  where collaborator_id = pg_temp.p('nadia') and skill_id = (select id from public.skills where name = 'Robotique FANUC');
update public.skill_levels set self_level = 3, validated_at = null
  where collaborator_id = pg_temp.p('mathilde') and skill_id = (select id from public.skills where name = 'Câblage d''armoires');
insert into public.skill_levels (collaborator_id, skill_id, self_level, manager_level, validated_at)
select pg_temp.p('elodie'), id, 1, null, null from public.skills where name = 'Lecture de schémas électriques'
on conflict (collaborator_id, skill_id) do update set self_level = 2, validated_at = null;

-- ─── Feedbacks ──────────────────────────────────────────────────────────
insert into public.feedbacks (team_id, collaborator_id, author_id, kind, body, is_shared, created_at) values
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('nadia'), pg_temp.p('claire'), 'reconnaissance', 'Mise en service de la cellule de palettisation bouclée avec deux jours d''avance. Le client a souligné la clarté de la formation de ses opérateurs.', true, now() - interval '5 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('nadia'), pg_temp.p('claire'), 'axe_progres', 'Les comptes rendus de fin de chantier arrivent parfois une semaine après le départ du site. Viser 48 h pour que l''ADV puisse facturer.', true, now() - interval '33 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('julien'), pg_temp.p('claire'), 'point_fort', 'Diagnostic très rapide sur la presse des Forges de l''Allier : la panne hydraulique a été identifiée au téléphone avant le déplacement.', true, now() - interval '12 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('julien'), pg_temp.p('claire'), 'axe_progres', 'Deux retours en moins de 30 jours chez Logistique Morvan. Prendre le temps de tester en charge avant de clôturer l''intervention.', false, now() - interval '19 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('karim'), pg_temp.p('claire'), 'reconnaissance', 'Signature de la Laiterie du Bocage (L3) : 412 k€. Très bon travail de préparation avec le bureau d''études.', true, now() - interval '27 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('karim'), pg_temp.p('claire'), 'axe_progres', 'Les devis partent avant validation des délais par l''atelier. Faire valider le planning par Thomas avant envoi.', true, now() - interval '8 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('elodie'), pg_temp.p('claire'), 'point_fort', 'Relances fournisseurs tenues pendant les congés de Karim, aucun retard de livraison sur la période.', true, now() - interval '22 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('elodie'), pg_temp.p('claire'), 'axe_progres', 'Trois erreurs de référence sur les commandes de pièces détachées en octobre. Mettre en place un double contrôle sur les commandes > 2 000 €.', false, now() - interval '13 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('thomas'), pg_temp.p('claire'), 'point_fort', 'Le réaménagement des postes 2 et 4 a fait gagner près de 3 h par armoire. Les opérateurs ont été associés dès le départ.', true, now() - interval '16 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('thomas'), pg_temp.p('claire'), 'axe_progres', 'Déléguer davantage le suivi des heures supplémentaires au chef d''équipe de nuit.', true, now() - interval '45 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('mathilde'), pg_temp.p('claire'), 'reconnaissance', 'Les nouvelles gammes convoyeur sont déjà utilisées par l''atelier. Bonne prise en main du sujet en moins de deux mois.', true, now() - interval '10 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('bastien'), pg_temp.p('claire'), 'point_fort', 'Rapports d''intervention complets, photos à l''appui. Les clients les citent dans leurs retours.', true, now() - interval '18 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('bastien'), pg_temp.p('claire'), 'axe_progres', 'Anticiper les commandes de pièces avant les tournées préventives pour éviter les seconds passages.', false, now() - interval '3 days');

-- ─── Météo hebdomadaire (26 semaines) ───────────────────────────────────
create temp table seed_weather_base (key text, mood int, load int);
insert into seed_weather_base values ('karim', 4, 3), ('elodie', 3, 2), ('thomas', 3, 4), ('nadia', 4, 4), ('julien', 4, 3), ('mathilde', 4, 3), ('bastien', 3, 3);
insert into public.weather_entries (collaborator_id, week_start, mood, workload, comment, created_at)
select pg_temp.p(b.key), w.ws,
  least(5, greatest(1, b.mood + pg_temp.noise(b.key || w.ws::text, 3) - 1)),
  least(5, greatest(1, b.load + pg_temp.noise(b.key || w.ws::text || 'l', 3) - 1)),
  '', pg_temp.ts(w.ws + 4, '16:10')
from seed_weather_base b
cross join lateral (select (date_trunc('week', current_date)::date - g * 7) as ws from generate_series(1, 25) g) w;
-- Semaine en cours : tout le monde n'a pas encore répondu.
insert into public.weather_entries (collaborator_id, week_start, mood, workload, comment)
select pg_temp.p(key), date_trunc('week', current_date)::date, mood, load, ''
from seed_weather_base where key in ('karim', 'thomas', 'nadia', 'mathilde');
-- Julien : baisse sur trois semaines ; Nadia : charge ressentie forte.
update public.weather_entries set mood = 4, workload = 3 where collaborator_id = pg_temp.p('julien') and week_start = date_trunc('week', current_date)::date - 21;
update public.weather_entries set mood = 3, workload = 4, comment = 'Beaucoup d''astreintes ce mois-ci.' where collaborator_id = pg_temp.p('julien') and week_start = date_trunc('week', current_date)::date - 14;
update public.weather_entries set mood = 2, workload = 5, comment = 'Trois urgences le même jour chez Morvan, pas eu le temps de finir les rapports.' where collaborator_id = pg_temp.p('julien') and week_start = date_trunc('week', current_date)::date - 7;
insert into public.weather_entries (collaborator_id, week_start, mood, workload, comment)
values (pg_temp.p('julien'), date_trunc('week', current_date)::date, 2, 5, 'Toujours sous l''eau, j''aimerais en parler.');
update public.weather_entries set workload = 5, comment = 'Deux chantiers en parallèle, Plasturgie et L3.' where collaborator_id = pg_temp.p('nadia') and week_start = date_trunc('week', current_date)::date;
update public.weather_entries set comment = 'Bonne semaine, la cellule est réceptionnée.' where collaborator_id = pg_temp.p('nadia') and week_start = date_trunc('week', current_date)::date - 14;
update public.weather_entries set comment = 'Calme côté commandes, je peux prendre d''autres sujets.' where collaborator_id = pg_temp.p('elodie') and week_start = date_trunc('week', current_date)::date - 7;

-- ─── Trames d'entretien ─────────────────────────────────────────────────
insert into public.review_templates (id, team_id, kind, name, description, is_default) values
  ('55555555-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'one_to_one', 'One-to-one mensuel', 'Échange régulier de 30 à 45 minutes, centré sur le collaborateur.', true),
  ('55555555-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'annuel', 'Entretien annuel d''évaluation', 'Bilan de l''année écoulée et objectifs de l''année suivante.', true),
  ('55555555-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'professionnel', 'Entretien professionnel', 'Obligatoire tous les deux ans (article L6315-1 du Code du travail). Porte sur les perspectives d''évolution, pas sur la performance.', true);

insert into public.template_questions (template_id, position, section, label, help, type, options) values
  ('55555555-0000-4000-8000-000000000001', 1, 'Depuis le dernier échange', 'Quelles sont vos réussites depuis notre dernier échange ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000001', 2, 'Depuis le dernier échange', 'Quelles difficultés ou quels blocages rencontrez-vous ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000001', 3, 'Charge', 'Comment évaluez-vous votre charge de travail actuelle ?', '1 : très faible · 3 : adaptée · 5 : excessive', 'echelle', '[]'),
  ('55555555-0000-4000-8000-000000000001', 4, 'Charge', 'De quel soutien auriez-vous besoin ?', '', 'choix', '["Formation", "Renfort ponctuel", "Arbitrage sur les priorités", "Outils ou matériel", "Aucun pour l''instant"]'),
  ('55555555-0000-4000-8000-000000000001', 5, 'Sujets libres', 'Sujets que vous souhaitez aborder', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 1, 'Bilan', 'Quel bilan faites-vous de votre année ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 2, 'Bilan', 'Dans quelle mesure vos objectifs ont-ils été atteints ?', '1 : pas atteints · 5 : dépassés', 'echelle', '[]'),
  ('55555555-0000-4000-8000-000000000002', 3, 'Compétences', 'Quelles compétences avez-vous le plus mobilisées ?', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 4, 'Compétences', 'Points forts', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 5, 'Compétences', 'Axes de progrès', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 6, 'Perspectives', 'Objectifs proposés pour l''année prochaine', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000002', 7, 'Perspectives', 'Souhaits d''évolution', '', 'choix', '["Rester sur le poste actuel", "Prendre plus de responsabilités", "Changer de métier dans l''entreprise", "Mobilité géographique"]'),
  ('55555555-0000-4000-8000-000000000002', 8, 'Perspectives', 'Souhaitez-vous suivre une formation l''an prochain ?', '', 'oui_non', '[]'),
  ('55555555-0000-4000-8000-000000000003', 1, 'Parcours', 'Votre parcours depuis le dernier entretien professionnel', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000003', 2, 'Parcours', 'Formations suivies', 'Intitulé, organisme et année', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000003', 3, 'Projet', 'Votre projet professionnel à 2 ou 3 ans', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000003', 4, 'Projet', 'Besoins en formation', '', 'texte', '[]'),
  ('55555555-0000-4000-8000-000000000003', 5, 'Projet', 'Mobilité souhaitée', '', 'choix', '["Aucune", "Interne, autre service", "Interne, autre site", "Externe"]'),
  ('55555555-0000-4000-8000-000000000003', 6, 'Projet', 'Avez-vous suivi au moins une formation non obligatoire ces deux dernières années ?', '', 'oui_non', '[]');

create function pg_temp.questions(tpl uuid) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('key', 'q' || position, 'section', section, 'label', label, 'help', help, 'type', type, 'options', options) order by position)
  from public.template_questions where template_id = tpl
$$;
create function pg_temp.tpl(k public.review_kind) returns uuid language sql as $$
  select case k when 'one_to_one' then '55555555-0000-4000-8000-000000000001'::uuid
    when 'annuel' then '55555555-0000-4000-8000-000000000002'::uuid else '55555555-0000-4000-8000-000000000003'::uuid end
$$;

-- ─── Entretiens passés (clos et signés) ─────────────────────────────────
create temp table seed_reviews (id uuid, key text, kind public.review_kind, d int, t text, state text, summary text);
insert into seed_reviews values
  -- dernier one-to-one de chacun (Élodie et Julien au-delà de 30 jours)
  ('66666666-0000-4000-8000-000000000001', 'nadia',    'one_to_one', -9,  '10:00', 'signe', 'Cellule Plasturgie réceptionnée. Charge élevée jusqu''à mi-décembre : priorité à la L3, report du module FANUC 2 en janvier.'),
  ('66666666-0000-4000-8000-000000000002', 'karim',    'one_to_one', -12, '09:30', 'signe', 'Bon trimestre commercial. Point d''attention sur la validation des délais atelier avant envoi des devis.'),
  ('66666666-0000-4000-8000-000000000003', 'mathilde', 'one_to_one', -16, '14:00', 'signe', 'Gammes convoyeur en production. Prochaine étape : tables élévatrices.'),
  ('66666666-0000-4000-8000-000000000004', 'thomas',   'one_to_one', -20, '16:00', 'signe', 'Réaménagement des postes 2 et 4 terminé. Sujet heures supplémentaires de nuit à traiter avec les RH.'),
  ('66666666-0000-4000-8000-000000000005', 'bastien',  'one_to_one', -27, '08:30', 'signe', 'Six clients équipés en préventif. Besoin d''un véhicule mieux équipé pour les tournées.'),
  ('66666666-0000-4000-8000-000000000006', 'julien',   'one_to_one', -35, '11:00', 'signe', 'Bonne dynamique sur le diagnostic à distance. Astreintes de novembre chargées.'),
  ('66666666-0000-4000-8000-000000000007', 'elodie',   'one_to_one', -41, '15:00', 'signe', 'Passage à l''EDI réussi. Réfléchir à de nouvelles missions.'),
  -- one-to-one plus anciens
  ('66666666-0000-4000-8000-000000000011', 'nadia',    'one_to_one', -44, '10:00', 'signe', 'Préparation de la cellule Plasturgie, planning tendu mais tenu.'),
  ('66666666-0000-4000-8000-000000000012', 'karim',    'one_to_one', -47, '09:30', 'signe', 'Relance des devis Laiterie du Bocage.'),
  ('66666666-0000-4000-8000-000000000013', 'julien',   'one_to_one', -68, '11:00', 'signe', 'Point sur les retours SAV, plan d''action validé.'),
  ('66666666-0000-4000-8000-000000000014', 'thomas',   'one_to_one', -55, '16:00', 'signe', 'Lancement du réaménagement de l''atelier de câblage.'),
  -- entretiens annuels de l'an dernier (échéances réglementaires à venir)
  ('66666666-0000-4000-8000-000000000021', 'karim',    'annuel', -352, '10:00', 'signe', 'Année solide, objectifs commerciaux atteints à 108 %.'),
  ('66666666-0000-4000-8000-000000000022', 'thomas',   'annuel', -342, '14:00', 'signe', 'Bonne tenue de l''atelier malgré deux départs. Priorité 2026 : organisation du câblage.'),
  ('66666666-0000-4000-8000-000000000023', 'julien',   'annuel', -357, '10:30', 'signe', 'Technicien fiable et autonome. Axe de progrès : qualité des clôtures d''intervention.'),
  ('66666666-0000-4000-8000-000000000024', 'nadia',    'annuel', -300, '10:00', 'signe', 'Montée en compétence remarquable sur la robotique.'),
  ('66666666-0000-4000-8000-000000000025', 'elodie',   'annuel', -296, '15:00', 'signe', 'Fiabilité de la saisie en progrès. Projet EDI à mener.'),
  ('66666666-0000-4000-8000-000000000026', 'bastien',  'annuel', -280, '09:00', 'signe', 'Première année complète réussie, très bons retours clients.'),
  ('66666666-0000-4000-8000-000000000027', 'mathilde', 'annuel', -250, '14:00', 'signe', 'Intégration réussie au service méthodes.'),
  -- entretiens professionnels
  ('66666666-0000-4000-8000-000000000031', 'mathilde', 'professionnel', -712, '14:00', 'signe', 'Souhaite évoluer vers le bureau d''études à moyen terme.'),
  ('66666666-0000-4000-8000-000000000032', 'thomas',   'professionnel', -420, '14:00', 'signe', 'Projet : formation management de proximité.'),
  ('66666666-0000-4000-8000-000000000033', 'julien',   'professionnel', -455, '10:00', 'signe', 'Intérêt pour une spécialisation hydraulique.'),
  ('66666666-0000-4000-8000-000000000034', 'karim',    'professionnel', -380, '10:00', 'signe', 'Souhaite piloter un grand compte agroalimentaire.'),
  ('66666666-0000-4000-8000-000000000035', 'elodie',   'professionnel', -510, '15:00', 'signe', 'Intérêt pour la comptabilité clients, formation à étudier.'),
  ('66666666-0000-4000-8000-000000000036', 'nadia',    'professionnel', -610, '10:00', 'signe', 'Projet : référente robotique de l''équipe.'),
  ('66666666-0000-4000-8000-000000000037', 'bastien',  'professionnel', -240, '09:00', 'signe', 'Premier entretien professionnel après la période d''intégration.'),
  -- clos mais pas encore signé par le collaborateur
  ('66666666-0000-4000-8000-000000000008', 'bastien',  'one_to_one', -2, '08:30', 'clos', 'Tournées préventives de décembre calées. Commande des pièces anticipée avec Élodie.'),
  -- à venir
  ('66666666-0000-4000-8000-000000000041', 'thomas',   'one_to_one', 1,  '16:00', 'prep_manager', ''),
  ('66666666-0000-4000-8000-000000000042', 'nadia',    'one_to_one', 2,  '10:00', 'a_preparer', ''),
  ('66666666-0000-4000-8000-000000000043', 'karim',    'one_to_one', 5,  '09:30', 'pret', ''),
  ('66666666-0000-4000-8000-000000000044', 'julien',   'annuel',     8,  '14:00', 'prep_collab', ''),
  ('66666666-0000-4000-8000-000000000045', 'mathilde', 'professionnel', 10, '14:00', 'a_preparer', ''),
  ('66666666-0000-4000-8000-000000000046', 'elodie',   'one_to_one', 12, '15:00', 'a_preparer', '');

insert into public.reviews (id, team_id, collaborator_id, manager_id, kind, template_id, questions, scheduled_at, duration_minutes, location, status,
  collaborator_prepared_at, manager_prepared_at, summary, live_notes, completed_at, collaborator_signed_at, manager_signed_at, created_at)
select r.id, '22222222-0000-4000-8000-000000000001', pg_temp.p(r.key), pg_temp.p('claire'), r.kind, pg_temp.tpl(r.kind), pg_temp.questions(pg_temp.tpl(r.kind)),
  pg_temp.ts(current_date + r.d, r.t),
  case r.kind when 'one_to_one' then 45 else 90 end,
  case r.kind when 'one_to_one' then 'Bureau de Claire' else 'Salle Garonne' end,
  case when r.state in ('signe', 'clos') then 'termine' else 'planifie' end::public.review_status,
  case when r.state in ('signe', 'clos', 'pret', 'prep_collab') then pg_temp.ts(current_date + least(r.d, 0) - 3, '18:00') end,
  case when r.state in ('signe', 'clos', 'pret', 'prep_manager') then pg_temp.ts(current_date + least(r.d, 0) - 1, '19:00') end,
  r.summary, '',
  case when r.state in ('signe', 'clos') then pg_temp.ts(current_date + r.d, r.t) + interval '50 minutes' end,
  case when r.state = 'signe' then pg_temp.ts(current_date + r.d + 1, '09:12') end,
  case when r.state in ('signe', 'clos') then pg_temp.ts(current_date + r.d, r.t) + interval '1 hour' end,
  pg_temp.ts(current_date + least(r.d, 0) - 14, '08:00')
from seed_reviews r;

update public.reviews set live_notes = E'Réception Plasturgie OK, réserve levée sur le capteur de présence.\nL3 : arrivée sur site le 2e lundi, prévoir l''accompagnement d''Élodie pour les bons de livraison.\nFANUC 2 : session de janvier, inscription à faire.'
  where id = '66666666-0000-4000-8000-000000000001';
update public.reviews set live_notes = E'Tournées de décembre : 4 clients, 2 avec pièces à commander.\nVéhicule : demande d''aménagement transmise aux services généraux.'
  where id = '66666666-0000-4000-8000-000000000008';

-- Réponses détaillées des entretiens de démonstration.
insert into public.review_answers (review_id, question_key, author, value) values
  ('66666666-0000-4000-8000-000000000001', 'q1', 'collaborateur', '"Réception de la cellule de palettisation sans réserve majeure. Formation des 6 opérateurs du client faite en deux sessions."'),
  ('66666666-0000-4000-8000-000000000001', 'q2', 'collaborateur', '"Les deux chantiers se chevauchent en décembre. Je n''ai pas pu avancer sur le module FANUC 2."'),
  ('66666666-0000-4000-8000-000000000001', 'q3', 'collaborateur', '5'),
  ('66666666-0000-4000-8000-000000000001', 'q4', 'collaborateur', '"Arbitrage sur les priorités"'),
  ('66666666-0000-4000-8000-000000000001', 'q5', 'collaborateur', '"Le poste de référente robotique évoqué en septembre."'),
  ('66666666-0000-4000-8000-000000000001', 'q1', 'manager', '"Cellule Plasturgie livrée en avance, très bon retour client."'),
  ('66666666-0000-4000-8000-000000000001', 'q2', 'manager', '"Charge trop concentrée sur Nadia en décembre."'),
  ('66666666-0000-4000-8000-000000000001', 'q3', 'manager', '4'),
  ('66666666-0000-4000-8000-000000000001', 'q4', 'manager', '"Arbitrage sur les priorités"'),
  ('66666666-0000-4000-8000-000000000001', 'q5', 'manager', '"Calendrier de la formation FANUC 2."'),
  ('66666666-0000-4000-8000-000000000008', 'q1', 'collaborateur', '"Six clients équipés en préventif, dont deux nouveaux ce mois-ci."'),
  ('66666666-0000-4000-8000-000000000008', 'q2', 'collaborateur', '"Pièces pas toujours disponibles au départ des tournées."'),
  ('66666666-0000-4000-8000-000000000008', 'q3', 'collaborateur', '3'),
  ('66666666-0000-4000-8000-000000000008', 'q4', 'collaborateur', '"Outils ou matériel"'),
  ('66666666-0000-4000-8000-000000000008', 'q3', 'manager', '3'),
  ('66666666-0000-4000-8000-000000000008', 'q1', 'manager', '"Tournées bien tenues, rapports appréciés."'),
  ('66666666-0000-4000-8000-000000000041', 'q1', 'manager', '"Postes 2 et 4 réaménagés, gain mesuré de 2 h 50 par armoire."'),
  ('66666666-0000-4000-8000-000000000041', 'q2', 'manager', '"Répartition des heures supplémentaires de l''équipe de nuit."'),
  ('66666666-0000-4000-8000-000000000041', 'q3', 'manager', '4'),
  ('66666666-0000-4000-8000-000000000043', 'q1', 'collaborateur', '"Deux nouveaux comptes ouverts : Conserverie Guillou et Fromagerie des Monts."'),
  ('66666666-0000-4000-8000-000000000043', 'q2', 'collaborateur', '"Délais atelier difficiles à obtenir avant l''envoi des devis."'),
  ('66666666-0000-4000-8000-000000000043', 'q3', 'collaborateur', '4'),
  ('66666666-0000-4000-8000-000000000043', 'q4', 'collaborateur', '"Arbitrage sur les priorités"'),
  ('66666666-0000-4000-8000-000000000043', 'q5', 'collaborateur', '"Salon CFIA de mars : qui y va ?"'),
  ('66666666-0000-4000-8000-000000000043', 'q1', 'manager', '"Bonne dynamique sur l''agroalimentaire, 29 devis émis."'),
  ('66666666-0000-4000-8000-000000000043', 'q2', 'manager', '"Devis envoyés sans validation du planning atelier."'),
  ('66666666-0000-4000-8000-000000000043', 'q3', 'manager', '2'),
  ('66666666-0000-4000-8000-000000000043', 'q4', 'manager', '"Aucun pour l''instant"'),
  ('66666666-0000-4000-8000-000000000044', 'q1', 'collaborateur', '"Année chargée avec la reprise du contrat Laiterie du Bocage. J''ai pris en charge les astreintes du secteur Ouest."'),
  ('66666666-0000-4000-8000-000000000044', 'q2', 'collaborateur', '3'),
  ('66666666-0000-4000-8000-000000000044', 'q3', 'collaborateur', '"Diagnostic hydraulique, diagnostic à distance par téléphone et visio."'),
  ('66666666-0000-4000-8000-000000000044', 'q4', 'collaborateur', '"Rapidité de diagnostic, relation client."'),
  ('66666666-0000-4000-8000-000000000044', 'q5', 'collaborateur', '"Mieux tester en charge avant de clôturer."'),
  ('66666666-0000-4000-8000-000000000044', 'q6', 'collaborateur', '"Former un second technicien aux astreintes Ouest."'),
  ('66666666-0000-4000-8000-000000000044', 'q7', 'collaborateur', '"Prendre plus de responsabilités"'),
  ('66666666-0000-4000-8000-000000000044', 'q8', 'collaborateur', 'true');

-- ─── Plan d'action ──────────────────────────────────────────────────────
insert into public.review_actions (review_id, title, owner_id, due_date, status, done_at, created_at) values
  ('66666666-0000-4000-8000-000000000001', 'S''inscrire à la session FANUC niveau 2 de janvier', pg_temp.p('nadia'), current_date + 10, 'a_faire', null, now() - interval '9 days'),
  ('66666666-0000-4000-8000-000000000001', 'Décaler la mise en service AFF-2598 d''une semaine', pg_temp.p('claire'), current_date - 2, 'fait', now() - interval '4 days', now() - interval '9 days'),
  ('66666666-0000-4000-8000-000000000002', 'Faire valider le planning atelier avant chaque devis > 50 k€', pg_temp.p('karim'), current_date + 20, 'en_cours', null, now() - interval '12 days'),
  ('66666666-0000-4000-8000-000000000004', 'Préparer le point heures supplémentaires avec les RH', pg_temp.p('thomas'), current_date - 3, 'en_cours', null, now() - interval '20 days'),
  ('66666666-0000-4000-8000-000000000005', 'Chiffrer l''aménagement du véhicule de tournée', pg_temp.p('bastien'), current_date - 6, 'a_faire', null, now() - interval '27 days'),
  ('66666666-0000-4000-8000-000000000006', 'Tester en charge avant toute clôture d''intervention', pg_temp.p('julien'), current_date - 10, 'en_cours', null, now() - interval '35 days'),
  ('66666666-0000-4000-8000-000000000007', 'Lister les tâches ADV qui pourraient être reprises par Élodie', pg_temp.p('claire'), current_date - 15, 'a_faire', null, now() - interval '41 days'),
  ('66666666-0000-4000-8000-000000000008', 'Commander les pièces des tournées de décembre', pg_temp.p('bastien'), current_date + 5, 'a_faire', null, now() - interval '2 days');

-- ─── Demande de one-to-one ──────────────────────────────────────────────
insert into public.review_requests (team_id, collaborator_id, message, preferred_date, created_at) values
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('julien'), 'J''aimerais faire le point sur les astreintes de décembre avant l''entretien annuel.', current_date + 3, now() - interval '1 day');

-- ─── Tâches ─────────────────────────────────────────────────────────────
create temp table seed_tasks (code text, title text, who text, prio public.task_priority, status public.task_status, due int, descr text);
insert into seed_tasks values
  ('AFF-2611', 'Valider le plan d''implantation avec le client', 'karim', 'haute', 'termine', -18, ''),
  ('AFF-2611', 'Câbler l''armoire principale L3', 'thomas', 'haute', 'en_cours', 6, 'Armoire 2 400 × 2 000, 3 départs moteurs supplémentaires par rapport au standard.'),
  ('AFF-2611', 'Programmer les séquences de remplissage', 'nadia', 'urgente', 'en_cours', 3, 'Reprendre le bloc FB_Remplissage de la ligne L2 et adapter les temporisations.'),
  ('AFF-2611', 'Préparer le dossier de mise en service', 'nadia', 'normale', 'a_faire', 14, ''),
  ('AFF-2611', 'Commander les capteurs de niveau IFM', 'elodie', 'haute', 'en_validation', 1, 'Devis fournisseur reçu, en attente du bon de commande signé.'),
  ('AFF-2604', 'Diagnostiquer la fuite du vérin principal', 'julien', 'urgente', 'termine', -9, ''),
  ('AFF-2604', 'Remplacer le groupe hydraulique', 'julien', 'haute', 'en_cours', -2, 'Groupe livré, intervention prévue avec deux techniciens.'),
  ('AFF-2604', 'Mettre à jour le dossier technique', 'mathilde', 'normale', 'a_faire', 12, ''),
  ('AFF-2604', 'Relancer le client pour l''acompte de 30 %', 'elodie', 'normale', 'termine', -6, ''),
  ('AFF-2615', 'Réception de la cellule de palettisation', 'nadia', 'haute', 'termine', -11, ''),
  ('AFF-2615', 'Former les opérateurs de nuit', 'nadia', 'normale', 'en_validation', -1, 'Session faite, feuille d''émargement à faire signer par le client.'),
  ('AFF-2615', 'Lever la réserve sur le capteur de présence', 'julien', 'haute', 'termine', -4, ''),
  ('AFF-2615', 'Facturer le solde', 'elodie', 'normale', 'a_faire', 5, ''),
  ('AFF-2598', 'Chiffrer l''extension du convoyeur zone B', 'karim', 'haute', 'en_cours', 4, 'Deux variantes : 12 m et 18 m.'),
  ('AFF-2598', 'Établir la gamme de fabrication des rouleaux', 'mathilde', 'normale', 'en_cours', 9, ''),
  ('AFF-2598', 'Vérifier la nomenclature des motoréducteurs', 'mathilde', 'basse', 'a_faire', 21, ''),
  ('SAV', 'Tournée préventive secteur Nord', 'bastien', 'normale', 'en_cours', 2, '4 clients : Morvan, Guillou, Bocage, Ardennes.'),
  ('SAV', 'Rapport d''intervention Forges de l''Allier', 'julien', 'haute', 'a_faire', -3, ''),
  ('SAV', 'Renouvellement contrat Conserverie Guillou', 'karim', 'normale', 'en_validation', 7, ''),
  ('SAV', 'Planifier les astreintes de décembre', 'thomas', 'urgente', 'a_faire', -1, 'Roulement à proposer avant validation de la direction.'),
  ('SAV', 'Commander les pièces des tournées de décembre', 'bastien', 'haute', 'a_faire', 5, ''),
  ('SAV', 'Analyse vibratoire broyeur Bocage', 'bastien', 'normale', 'termine', -13, ''),
  ('INT', 'Mettre à jour le référentiel des habilitations', 'thomas', 'basse', 'a_faire', 30, ''),
  ('INT', 'Standardiser le modèle de rapport d''intervention', 'mathilde', 'normale', 'en_validation', -2, ''),
  ('INT', 'Réaménager le poste de câblage n° 5', 'thomas', 'normale', 'en_cours', 16, ''),
  ('INT', 'Archiver les dossiers clients 2023', 'elodie', 'basse', 'a_faire', 25, ''),
  ('INT', 'Mettre en place le double contrôle des commandes > 2 000 €', 'elodie', 'haute', 'en_cours', 8, '');
insert into public.tasks (team_id, project_id, title, description, assignee_id, priority, status, due_date, position, created_by, created_at)
select '22222222-0000-4000-8000-000000000001', p.id, t.title, t.descr, pg_temp.p(t.who), t.prio, t.status, current_date + t.due,
  row_number() over (partition by t.status order by t.due), pg_temp.p('claire'), now() - ((30 - t.due / 2) || ' days')::interval
from seed_tasks t join public.projects p on p.code = t.code;

-- ─── Plan de charge (8 semaines passées, 6 à venir) ─────────────────────
create temp table seed_alloc (key text, code text, base int);
insert into seed_alloc values
  ('karim', 'AFF-2598', 30), ('karim', 'AFF-2611', 20), ('karim', 'SAV', 25),
  ('elodie', 'AFF-2611', 20), ('elodie', 'INT', 18), ('elodie', 'AFF-2604', 15),
  ('thomas', 'AFF-2611', 45), ('thomas', 'INT', 25), ('thomas', 'SAV', 15),
  ('nadia', 'AFF-2611', 60), ('nadia', 'AFF-2615', 40),
  ('julien', 'SAV', 55), ('julien', 'AFF-2604', 35),
  ('mathilde', 'AFF-2598', 35), ('mathilde', 'INT', 30), ('mathilde', 'AFF-2604', 15),
  ('bastien', 'SAV', 70), ('bastien', 'AFF-2615', 10);
insert into public.workload_allocations (collaborator_id, project_id, week_start, percent)
select pg_temp.p(a.key), p.id, w.ws,
  greatest(0, a.base + pg_temp.noise(a.key || a.code || w.ws::text, 15) - 7
    + case when a.key = 'nadia' and w.ws between date_trunc('week', current_date)::date and date_trunc('week', current_date)::date + 7 then 12 else 0 end
    + case when a.key = 'julien' and w.ws between date_trunc('week', current_date)::date - 21 and date_trunc('week', current_date)::date then 10 else 0 end
    - case when a.code = 'AFF-2615' and w.ws > date_trunc('week', current_date)::date + 14 then a.base else 0 end)
from seed_alloc a
join public.projects p on p.code = a.code
cross join lateral (select date_trunc('week', current_date)::date + g * 7 as ws from generate_series(-26, 5) g) w;

-- ─── Absences ───────────────────────────────────────────────────────────
insert into public.absences (team_id, collaborator_id, kind, start_date, end_date, status, comment, decided_by, decided_at, created_at) values
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('karim'), 'conges_payes', current_date - 26, current_date - 22, 'validee', 'Vacances de la Toussaint', pg_temp.p('claire'), now() - interval '50 days', now() - interval '52 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('mathilde'), 'formation', current_date + 6, current_date + 7, 'validee', 'Formation SolidWorks Inspection', pg_temp.p('claire'), now() - interval '20 days', now() - interval '21 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('thomas'), 'rtt', current_date + 4, current_date + 4, 'validee', '', pg_temp.p('claire'), now() - interval '6 days', now() - interval '7 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('elodie'), 'conges_payes', date_trunc('week', current_date)::date + 14, date_trunc('week', current_date)::date + 18, 'en_attente', 'Mariage de ma sœur', null, null, now() - interval '2 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('julien'), 'conges_payes', date_trunc('week', current_date)::date + 16, date_trunc('week', current_date)::date + 17, 'en_attente', '', null, null, now() - interval '1 day'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('bastien'), 'rtt', date_trunc('week', current_date)::date + 16, date_trunc('week', current_date)::date + 16, 'validee', '', pg_temp.p('claire'), now() - interval '9 days', now() - interval '10 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('nadia'), 'conges_payes', current_date + 45, current_date + 56, 'validee', 'Congés de fin d''année', pg_temp.p('claire'), now() - interval '30 days', now() - interval '35 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('karim'), 'conges_payes', current_date + 46, current_date + 53, 'en_attente', '', null, null, now() - interval '3 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('julien'), 'maladie', current_date - 40, current_date - 38, 'validee', '', pg_temp.p('claire'), now() - interval '40 days', now() - interval '40 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('elodie'), 'rtt', current_date - 4, current_date - 4, 'validee', '', pg_temp.p('claire'), now() - interval '12 days', now() - interval '13 days'),
  ('22222222-0000-4000-8000-000000000001', pg_temp.p('thomas'), 'conges_payes', current_date + 30, current_date + 32, 'refusee', 'Pont', pg_temp.p('claire'), now() - interval '5 days', now() - interval '8 days');
update public.absences set decision_comment = 'Période de réception de la L3, impossible de libérer l''atelier.' where status = 'refusee';

-- ─── Réunions, décisions et actions ─────────────────────────────────────
insert into public.meetings (id, team_id, title, held_on, participants, notes, created_by, created_at) values
  ('77777777-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'Point hebdomadaire opérations', current_date - 2,
    array[pg_temp.p('claire'), pg_temp.p('karim'), pg_temp.p('thomas'), pg_temp.p('nadia'), pg_temp.p('julien'), pg_temp.p('mathilde')],
    E'Charge atelier : L3 prioritaire jusqu''à la réception.\nSAV : deux urgences Morvan cette semaine, Julien en renfort de Bastien.\nCommercial : extension convoyeur zone B à chiffrer avant vendredi.', pg_temp.p('claire'), now() - interval '2 days'),
  ('77777777-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'Revue mensuelle sécurité', current_date - 13,
    array[pg_temp.p('claire'), pg_temp.p('thomas'), pg_temp.p('bastien'), pg_temp.p('julien')],
    E'Aucun accident avec arrêt depuis 214 jours.\nPresqu''accident : chute d''outil depuis la passerelle du poste 3.\nHabilitations électriques : 2 recyclages à programmer.', pg_temp.p('claire'), now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000003', '22222222-0000-4000-8000-000000000001', 'Point hebdomadaire opérations', current_date - 9,
    array[pg_temp.p('claire'), pg_temp.p('karim'), pg_temp.p('thomas'), pg_temp.p('elodie'), pg_temp.p('nadia')],
    E'Réception Plasturgie validée.\nAcompte Forges de l''Allier encaissé.', pg_temp.p('claire'), now() - interval '9 days'),
  ('77777777-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000001', 'Lancement affaire AFF-2611', current_date - 34,
    array[pg_temp.p('claire'), pg_temp.p('karim'), pg_temp.p('thomas'), pg_temp.p('nadia'), pg_temp.p('mathilde'), pg_temp.p('elodie')],
    E'Revue du cahier des charges client.\nJalons : FAT en atelier S+6, livraison S+8, mise en service S+9.', pg_temp.p('claire'), now() - interval '34 days');

insert into public.decisions (meeting_id, title, details, created_at) values
  ('77777777-0000-4000-8000-000000000001', 'Gel des nouvelles affaires atelier jusqu''à la réception L3', 'Les demandes urgentes passent par Claire.', now() - interval '2 days'),
  ('77777777-0000-4000-8000-000000000001', 'Julien en renfort SAV sur le secteur Nord cette semaine', '', now() - interval '2 days'),
  ('77777777-0000-4000-8000-000000000002', 'Pose de garde-corps à plinthe sur la passerelle du poste 3', 'Budget : 2 450 € HT, devis Sécurimétal.', now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000002', 'Recyclage habilitation électrique pour Julien et Bastien en janvier', '', now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000003', 'Facturation du solde Plasturgie dès signature du PV', '', now() - interval '9 days'),
  ('77777777-0000-4000-8000-000000000004', 'Nadia pilote la mise en service L3', 'Thomas en appui pour le câblage.', now() - interval '34 days'),
  ('77777777-0000-4000-8000-000000000004', 'Réunion de chantier hebdomadaire le mardi à 8 h 30', '', now() - interval '34 days');

insert into public.meeting_actions (meeting_id, title, owner_id, due_date, status, done_at, created_at) values
  ('77777777-0000-4000-8000-000000000001', 'Envoyer le chiffrage convoyeur zone B', pg_temp.p('karim'), current_date + 2, 'en_cours', null, now() - interval '2 days'),
  ('77777777-0000-4000-8000-000000000001', 'Prévenir les clients du gel temporaire', pg_temp.p('claire'), current_date + 1, 'a_faire', null, now() - interval '2 days'),
  ('77777777-0000-4000-8000-000000000002', 'Commander les garde-corps', pg_temp.p('thomas'), current_date - 5, 'fait', now() - interval '6 days', now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000002', 'Inscrire Julien et Bastien au recyclage B2V', pg_temp.p('claire'), current_date - 1, 'a_faire', null, now() - interval '13 days'),
  ('77777777-0000-4000-8000-000000000003', 'Faire signer le PV de réception Plasturgie', pg_temp.p('nadia'), current_date - 4, 'fait', now() - interval '5 days', now() - interval '9 days'),
  ('77777777-0000-4000-8000-000000000004', 'Rédiger l''analyse fonctionnelle L3', pg_temp.p('nadia'), current_date - 20, 'fait', now() - interval '22 days', now() - interval '34 days'),
  ('77777777-0000-4000-8000-000000000004', 'Commander l''armoire et les composants longs délais', pg_temp.p('elodie'), current_date - 25, 'fait', now() - interval '27 days', now() - interval '34 days'),
  ('77777777-0000-4000-8000-000000000004', 'Mettre à jour la gamme de câblage armoire L3', pg_temp.p('mathilde'), current_date + 4, 'en_cours', null, now() - interval '34 days');

-- ─── Matrice de délégation ──────────────────────────────────────────────
create temp table seed_domains (pos int, name text, descr text);
insert into seed_domains values
  (1, 'Achats < 1 500 € HT', 'Pièces, consommables, petit outillage'),
  (2, 'Planning des interventions SAV', 'Affectation et ordre des interventions'),
  (3, 'Devis clients < 20 k€', 'Chiffrage et envoi sans validation préalable'),
  (4, 'Gestes commerciaux', 'Remises, prestations offertes'),
  (5, 'Arrêt d''une machine chez un client', 'Décision de consignation pour raison de sécurité'),
  (6, 'Modification de gamme de fabrication', ''),
  (7, 'Organisation de l''atelier', 'Postes, horaires, priorités du jour');
insert into public.delegation_domains (team_id, name, description, position)
select '22222222-0000-4000-8000-000000000001', name, descr, pos from seed_domains;

create temp table seed_deleg (key text, levels text[]);
insert into seed_deleg values
  ('karim',    '{propose,execute,decide,propose,execute,execute,execute}'),
  ('elodie',   '{decide,execute,execute,execute,execute,execute,execute}'),
  ('thomas',   '{decide,propose,execute,execute,decide,propose,decide}'),
  ('nadia',    '{propose,propose,execute,execute,decide,propose,execute}'),
  ('julien',   '{decide,decide,execute,propose,decide,execute,execute}'),
  ('mathilde', '{propose,execute,execute,execute,execute,decide,propose}'),
  ('bastien',  '{propose,decide,execute,propose,decide,execute,execute}');
insert into public.delegations (collaborator_id, domain_id, level)
select pg_temp.p(d.key), dd.id, d.levels[sd.pos]::public.delegation_level
from seed_deleg d cross join seed_domains sd join public.delegation_domains dd on dd.name = sd.name;
