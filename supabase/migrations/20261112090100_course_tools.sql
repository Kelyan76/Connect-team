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
