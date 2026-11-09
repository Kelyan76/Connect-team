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
