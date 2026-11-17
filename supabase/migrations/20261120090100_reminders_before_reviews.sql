-- Rappels juste avant les 1 à 1 : la veille à 17 h et environ 1 heure avant (heure de Paris).
-- L'Edge Function send-reminders est appelée toutes les 15 minutes en journée, du lundi au vendredi.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.unschedule(jobid) from cron.job where jobname = 'connect-team-rappels-1a1';
    -- De 5 h à 19 h 45 UTC (7 h à 21 h à Paris selon la saison).
    perform cron.schedule(
      'connect-team-rappels-1a1',
      '*/15 5-19 * * 1-5',
      $job$
        select net.http_post(
          url := 'https://zwfxctoycuxhqukdopbk.supabase.co/functions/v1/send-reminders',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := '{"mode": "bientot"}'::jsonb
        )
      $job$
    );
  end if;
end $$;
