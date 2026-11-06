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
