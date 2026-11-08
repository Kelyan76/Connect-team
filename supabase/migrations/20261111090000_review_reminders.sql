-- Cadence — rappel le matin d'un entretien : « Entretien aujourd'hui à 14:00 avec … »,
-- pour le manager et le collaborateur. Au plus un rappel par jour et par personne.
alter table public.notification_prefs
  add column review_alerts boolean not null default true,
  add column last_review_reminder date;
