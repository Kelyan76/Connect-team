-- Connect Team — « Mon parcours » : historique de réussites pour l'équipe modèle (données fictives),
-- afin que chaque collaborateur de démonstration ait un parcours à montrer.
-- Hugo, aujourd'hui en retrait, a un passé de « moteur » : reconnaissances, objectif atteint, mission réussie.

-- Objectifs atteints (100 %).
insert into public.objectives (id, team_id, scope, owner_id, title, description, means, agreed, start_date, due_date, created_by, created_at)
select o.id::uuid, '22222222-0000-4000-8000-000000000002', 'individuel', o.owner::uuid, o.title, o.descr, o.means, true,
  current_date + o.s, current_date + o.e, '11111111-0000-4000-8000-000000000101', (current_date + o.s)::timestamptz
from (values
  ('44444444-0000-4000-8000-000000000121', '11111111-0000-4000-8000-000000000103', 'Rendre le planning accessible (RGAA niveau AA)', 'Audit et corrections des 12 écrans du planning.', 'Formation RGAA de deux jours.', -220, -70),
  ('44444444-0000-4000-8000-000000000122', '11111111-0000-4000-8000-000000000102', 'Diviser par deux le temps de synchronisation', 'Synchronisation des agendas en moins de 30 secondes.', 'Une journée par semaine sans réunion.', -260, -120),
  ('44444444-0000-4000-8000-000000000123', '11111111-0000-4000-8000-000000000107', 'Mettre en place la supervision de la production', 'Alertes et tableaux de bord sur les services critiques.', 'Budget outil de supervision.', -300, -150),
  ('44444444-0000-4000-8000-000000000124', '11111111-0000-4000-8000-000000000106', 'Publier l''application mobile 2.0', 'Publication sur les deux stores.', 'Appareils de test.', -330, -180)
) as o(id, owner, title, descr, means, s, e)
where exists (select 1 from public.teams where id = '22222222-0000-4000-8000-000000000002');

insert into public.key_results (objective_id, title, unit, start_value, target_value, current_value, validated_at, position)
select k.obj::uuid, k.title, k.unit, k.start_value, k.target_value, k.target_value, now() + (k.d || ' days')::interval, 0
from (values
  ('44444444-0000-4000-8000-000000000121', 'Écrans conformes', 'écrans', 0, 12, -72),
  ('44444444-0000-4000-8000-000000000122', 'Durée de synchronisation', 's', 60, 30, -125),
  ('44444444-0000-4000-8000-000000000123', 'Services supervisés', 'services', 0, 8, -155),
  ('44444444-0000-4000-8000-000000000124', 'Note sur les stores', '/5', 3.2, 3.6, -185)
) as k(obj, title, unit, start_value, target_value, d)
where exists (select 1 from public.objectives where id = k.obj::uuid);

-- Missions réussies.
insert into public.delegation_missions (team_id, collaborator_id, title, expected_result, limits, support, checkpoints, due_date, autonomy, status, debrief, created_by, created_at, updated_at)
select '22222222-0000-4000-8000-000000000002', m.who::uuid, m.title, m.expected, '', '', '', current_date + m.d, m.autonomy, 'terminee', m.debrief,
  '11111111-0000-4000-8000-000000000101', now() + ((m.d - 40) || ' days')::interval, now() + (m.d || ' days')::interval
from (values
  ('11111111-0000-4000-8000-000000000103', 'Audit d''accessibilité du planning', 'Liste priorisée des corrections.', -75, 3, 'Audit clair et priorisé, repris tel quel par l''équipe produit.'),
  ('11111111-0000-4000-8000-000000000107', 'Migration des sauvegardes', 'Sauvegardes testées chaque semaine.', -110, 4, 'Migration sans interruption de service. Procédure documentée.'),
  ('11111111-0000-4000-8000-000000000105', 'Former l''équipe à l''outil de test', 'Chaque développeur écrit un scénario seul.', -60, 3, 'Atelier très apprécié ; Lucas écrit désormais ses tests seul.'),
  ('11111111-0000-4000-8000-000000000108', 'Organiser les premiers tests utilisateurs', 'Protocole et panel de 6 clients.', -50, 2, 'Protocole réutilisable, première restitution réussie.')
) as m(who, title, expected, d, autonomy, debrief)
where exists (select 1 from public.teams where id = '22222222-0000-4000-8000-000000000002');

-- Reconnaissances plus anciennes (partagées).
insert into public.feedbacks (team_id, collaborator_id, author_id, kind, body, desc_d, desc_e, is_shared, created_at)
select '22222222-0000-4000-8000-000000000002', f.who::uuid, '11111111-0000-4000-8000-000000000101', 'reconnaissance', f.d || ' ' || f.e, f.d, f.e, true, now() + (f.ago || ' days')::interval
from (values
  ('11111111-0000-4000-8000-000000000102', 'Ta démo de la nouvelle synchronisation au comité technique a convaincu tout le monde.', 'J''étais fière de présenter ce travail.', -82),
  ('11111111-0000-4000-8000-000000000102', 'Tu as pris en main l''incident du week-end sans qu''on te le demande.', 'Merci, tu as rassuré toute l''équipe.', -135),
  ('11111111-0000-4000-8000-000000000103', 'L''audit d''accessibilité a fait gagner trois semaines à l''équipe produit.', 'C''est exactement le niveau d''exigence que j''attendais.', -70),
  ('11111111-0000-4000-8000-000000000103', 'Ta première session de guilde a réuni les trois équipes front.', 'Bravo pour cette initiative.', -20),
  ('11111111-0000-4000-8000-000000000104', 'Ta première démo en revue de sprint était claire et bien préparée.', 'Je suis contente de tes progrès.', -2),
  ('11111111-0000-4000-8000-000000000107', 'La migration des sauvegardes s''est faite sans aucune interruption.', 'Merci pour ce travail minutieux.', -108)
) as f(who, d, e, ago)
where exists (select 1 from public.teams where id = '22222222-0000-4000-8000-000000000002');

-- Engagements tenus après les 1 à 1.
insert into public.review_actions (review_id, title, owner_id, due_date, status, done_at, created_at)
select a.review::uuid, a.title, a.who::uuid, current_date + a.d, 'fait', now() + (a.d || ' days')::interval, now() + ((a.d - 10) || ' days')::interval
from (values
  ('66666666-0000-4000-8000-000000000111', 'Présenter l''étude de la synchronisation au comité technique', '11111111-0000-4000-8000-000000000102', -30),
  ('66666666-0000-4000-8000-000000000112', 'Lancer la guilde front-end', '11111111-0000-4000-8000-000000000103', -18),
  ('66666666-0000-4000-8000-000000000105', 'Proposer un binôme hebdomadaire à Lucas', '11111111-0000-4000-8000-000000000105', -10),
  ('66666666-0000-4000-8000-000000000104', 'Publier le post-mortem de l''incident base de données', '11111111-0000-4000-8000-000000000107', -4),
  ('66666666-0000-4000-8000-000000000102', 'Ajouter les notes de version à la checklist de publication', '11111111-0000-4000-8000-000000000106', -6),
  ('66666666-0000-4000-8000-000000000107', 'Partager le protocole de tests utilisateurs', '11111111-0000-4000-8000-000000000108', -12)
) as a(review, title, who, d)
where exists (select 1 from public.reviews where id = a.review::uuid);
