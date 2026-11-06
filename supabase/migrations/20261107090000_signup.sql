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
