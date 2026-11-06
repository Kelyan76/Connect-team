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
