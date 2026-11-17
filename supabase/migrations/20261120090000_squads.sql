-- Équipes au sein de l'équipe du manager (ex. « Back-end », « Mobile », « Qualité »).
-- Le manager les crée, les attribue à ses collaborateurs, et peut fixer un objectif commun à toute une équipe.
create table public.squads (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null default public.auth_team_id() references public.teams (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  created_at timestamptz not null default now(),
  unique (team_id, name)
);
create index squads_team_idx on public.squads (team_id);

alter table public.squads enable row level security;
create policy "équipes visibles de toute l'équipe" on public.squads
  for select to authenticated using (team_id = public.auth_team_id());
create policy "équipes gérées par le manager" on public.squads
  for all to authenticated
  using (team_id = public.auth_team_id() and public.auth_is_manager())
  with check (team_id = public.auth_team_id() and public.auth_is_manager());
grant select, insert, update, delete on public.squads to authenticated;

alter table public.profiles add column squad_id uuid references public.squads (id) on delete set null;
alter table public.objectives add column squad_id uuid references public.squads (id) on delete set null;
-- Un objectif d'équipe peut cibler une équipe ; un objectif individuel, non.
alter table public.objectives add constraint objectives_squad_scope check (squad_id is null or scope = 'equipe');

-- L'équipe attribuée doit appartenir à la même équipe de manager.
create function public.check_squad_same_team() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.squad_id is not null
     and not exists (select 1 from public.squads s where s.id = new.squad_id and s.team_id = new.team_id) then
    raise exception 'Équipe inconnue.' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger profiles_squad_team before insert or update of squad_id, team_id on public.profiles
  for each row execute function public.check_squad_same_team();
create trigger objectives_squad_team before insert or update of squad_id, team_id on public.objectives
  for each row execute function public.check_squad_same_team();

-- Objectif d'une équipe : ses membres proposent l'avancement (le manager valide), comme pour un objectif individuel.
create or replace function public.propose_key_result_value(p_key_result_id uuid, p_value numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_scope public.objective_scope;
  v_squad uuid;
begin
  select o.owner_id, o.scope, o.squad_id into v_owner, v_scope, v_squad
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
  elsif (v_scope = 'individuel' and v_owner = auth.uid())
     or (v_scope = 'equipe' and v_squad is not null
         and exists (select 1 from public.profiles p where p.id = auth.uid() and p.squad_id = v_squad and p.is_active)) then
    update public.key_results set pending_value = p_value, pending_at = now() where id = p_key_result_id;
  else
    raise exception 'Seul le responsable de l''objectif peut mettre à jour cet avancement.' using errcode = '42501';
  end if;
end $$;
