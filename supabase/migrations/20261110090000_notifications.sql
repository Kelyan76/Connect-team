-- Cadence — rappels et notifications (Web Push).
-- • push_subscriptions : un abonnement par appareil (navigateur ou application installée).
-- • notification_prefs : choix de chaque utilisateur (rappel du pouls et son heure, récap du lundi,
--   demandes de one-to-one) et dates du dernier envoi (au plus un rappel par jour, un récap par semaine).
-- • Sur Supabase : tâche planifiée (pg_cron + pg_net) qui appelle l'Edge Function send-reminders
--   chaque heure en matinée, du lundi au vendredi.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text not null default '' check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy "abonnements : les siens" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  pulse_reminder boolean not null default true,
  pulse_hour smallint not null default 9 check (pulse_hour between 7 and 12),
  weekly_recap boolean not null default true,
  request_alerts boolean not null default true,
  last_pulse_reminder date,
  last_recap date,
  updated_at timestamptz not null default now()
);
create trigger notification_prefs_updated_at before update on public.notification_prefs
  for each row execute function public.set_updated_at();

alter table public.notification_prefs enable row level security;
create policy "préférences : les siennes" on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.push_subscriptions, public.notification_prefs from anon;
grant select, insert, update, delete on public.push_subscriptions, public.notification_prefs to authenticated;
grant select, insert, update, delete on public.push_subscriptions, public.notification_prefs to service_role;

-- Planification (Supabase uniquement : la base de démonstration locale n'a pas pg_cron).
-- L'Edge Function ne fait rien hors de la plage horaire prévue et n'envoie qu'un rappel par jour
-- et par personne : un appel en trop est sans effet.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.unschedule(jobid) from cron.job where jobname = 'connect-team-rappels';
    -- Toutes les heures de 5 h à 11 h UTC (7 h à 12 h à Paris selon la saison), du lundi au vendredi.
    perform cron.schedule(
      'connect-team-rappels',
      '0 5-11 * * 1-5',
      $job$
        select net.http_post(
          url := 'https://zwfxctoycuxhqukdopbk.supabase.co/functions/v1/send-reminders',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := '{}'::jsonb
        )
      $job$
    );
  end if;
end $$;
