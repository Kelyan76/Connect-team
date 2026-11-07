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
