// Edge Function (Deno) appelée chaque heure en matinée par pg_cron (voir migration 20261110090000).
// • Collaborateurs : rappel du pouls du jour à l'heure choisie, s'il n'est pas encore donné.
// • Manager et collaborateur : rappel des entretiens du jour (« Entretien aujourd’hui à 14:00 avec … »).
// • Managers, le lundi : récap de la semaine (moral bas, surcharge, demandes, entretiens, retards).
// Sans effet hors plage horaire ; au plus un rappel par jour et un récap par semaine et par personne.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { pushReady, secretKey, sendToUsers } from '../_shared/push.ts';
import {
  DEFAULT_PREFS,
  inSendingWindow,
  parisClock,
  parisTime,
  pulseWatchlist,
  recapMessage,
  reviewDayMessage,
  shouldRemindPulse,
  shouldRemindReviews,
  shouldSendRecap,
  type Prefs,
} from '../_shared/schedule.ts';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

Deno.serve(async () => {
  const clock = parisClock(new Date());
  if (!inSendingWindow(clock)) return json(200, { skipped: 'hors plage' });
  if (!pushReady()) return json(200, { skipped: 'clés VAPID absentes' });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), { auth: { persistSession: false } });

  // Seules les personnes avec au moins un appareil abonné sont concernées.
  const { data: subs } = await admin.from('push_subscriptions').select('user_id');
  const userIds = [...new Set((subs ?? []).map((s: { user_id: string }) => s.user_id))];
  if (!userIds.length) return json(200, { sent: 0 });

  const [{ data: people }, { data: prefRows }, { data: todayPulses }] = await Promise.all([
    admin.from('profiles').select('id, team_id, role, first_name, is_active').in('id', userIds),
    admin.from('notification_prefs').select('*').in('user_id', userIds),
    admin.from('daily_pulses').select('collaborator_id').eq('day', clock.date).in('collaborator_id', userIds),
  ]);
  const prefsOf = new Map((prefRows ?? []).map((p: Prefs & { user_id: string }) => [p.user_id, p]));
  const answered = new Set((todayPulses ?? []).map((p: { collaborator_id: string }) => p.collaborator_id));
  let reminders = 0;
  let recaps = 0;
  let reviewReminders = 0;

  // Entretiens planifiés aujourd'hui (heure de Paris) qui concernent une personne abonnée.
  const { data: reviewRows } = await admin
    .from('reviews')
    .select('id, kind, scheduled_at, manager_id, collaborator_id')
    .eq('status', 'planifie')
    .gte('scheduled_at', addDays(clock.date, -1))
    .lte('scheduled_at', `${addDays(clock.date, 1)}T23:59:59Z`);
  const todayReviews = ((reviewRows ?? []) as { id: string; kind: string; scheduled_at: string; manager_id: string; collaborator_id: string }[]).filter(
    (r) => parisClock(new Date(r.scheduled_at)).date === clock.date && (userIds.includes(r.manager_id) || userIds.includes(r.collaborator_id)),
  );
  const participantIds = [...new Set(todayReviews.flatMap((r) => [r.manager_id, r.collaborator_id]))];
  const { data: participants } = participantIds.length
    ? await admin.from('profiles').select('id, first_name, last_name').in('id', participantIds)
    : { data: [] };
  const nameOf = new Map((participants ?? []).map((p: { id: string; first_name: string; last_name: string }) => [p.id, `${p.first_name} ${p.last_name}`]));
  const KIND: Record<string, string> = { one_to_one: 'One-to-one', annuel: 'Entretien annuel', professionnel: 'Entretien professionnel' };

  for (const person of (people ?? []) as { id: string; team_id: string; role: string; first_name: string; is_active: boolean }[]) {
    if (!person.is_active) continue;
    const prefs = { ...DEFAULT_PREFS, ...(prefsOf.get(person.id) ?? {}) };

    const mine = todayReviews.filter((r) => r.manager_id === person.id || r.collaborator_id === person.id);
    if (shouldRemindReviews(prefs, clock, mine.length)) {
      const msg = reviewDayMessage(
        mine.map((r) => ({
          id: r.id,
          time: parisTime(r.scheduled_at),
          with: nameOf.get(r.manager_id === person.id ? r.collaborator_id : r.manager_id) ?? 'votre interlocuteur',
          kind: KIND[r.kind] ?? 'Entretien',
        })),
      );
      const n = await sendToUsers(admin, [person.id], { ...msg, tag: `entretiens-${clock.date}` });
      if (n) reviewReminders += 1;
      await admin.from('notification_prefs').upsert({ user_id: person.id, last_review_reminder: clock.date });
    }

    if (person.role === 'collaborateur' && shouldRemindPulse(prefs, clock, answered.has(person.id))) {
      const n = await sendToUsers(admin, [person.id], {
        title: `Bonjour ${person.first_name}, comment ça va ?`,
        body: 'Votre pouls du jour : humeur, motivation et charge en 10 secondes.',
        url: '/',
        tag: 'pouls',
      });
      if (n) reminders += 1;
      await admin.from('notification_prefs').upsert({ user_id: person.id, last_pulse_reminder: clock.date });
    }

    if (person.role === 'manager' && shouldSendRecap(prefs, clock)) {
      const since = addDays(clock.date, -10);
      const weekEnd = addDays(clock.date, 6);
      const [{ data: team }, { data: pulses }, { count: requests }, { count: lateTasks }, { count: reviews }] = await Promise.all([
        admin.from('profiles').select('id, first_name').eq('team_id', person.team_id).eq('role', 'collaborateur').eq('is_active', true),
        admin.from('daily_pulses').select('collaborator_id, day, mood, workload').eq('team_id', person.team_id).gte('day', since),
        admin.from('review_requests').select('id', { count: 'exact', head: true }).eq('team_id', person.team_id).eq('status', 'en_attente'),
        admin.from('tasks').select('id', { count: 'exact', head: true }).eq('team_id', person.team_id).neq('status', 'termine').lt('due_date', clock.date),
        admin
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', person.team_id)
          .eq('status', 'planifie')
          .gte('scheduled_at', clock.date)
          .lte('scheduled_at', `${weekEnd}T23:59:59`),
      ]);
      const names = new Map((team ?? []).map((t: { id: string; first_name: string }) => [t.id, t.first_name]));
      const watch = pulseWatchlist(pulses ?? [], names);
      const msg = recapMessage({ requests: requests ?? 0, lateTasks: lateTasks ?? 0, reviewsThisWeek: reviews ?? 0, ...watch });
      const n = await sendToUsers(admin, [person.id], { ...msg, url: '/?vue=pouls', tag: 'recap' });
      if (n) recaps += 1;
      await admin.from('notification_prefs').upsert({ user_id: person.id, last_recap: clock.date });
    }
  }

  return json(200, { clock, reminders, recaps, reviewReminders });
});
