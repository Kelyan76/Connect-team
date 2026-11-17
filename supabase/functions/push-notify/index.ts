// Edge Function (Deno) appelée par l'application, avec la session de l'utilisateur.
// • { type: 'test' } : notification de test sur ses propres appareils.
// • { type: 'review_request', request_id } : le collaborateur vient de demander un one-to-one,
//   son manager est prévenu sur ses appareils (s'il n'a pas désactivé ces alertes).
// • { type: 'absence_request', absence_id } : demande de congé, prévient le manager.
// • { type: 'absence_decision', absence_id } : congé accepté ou refusé, prévient le collaborateur.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { pushReady, secretKey, sendToUsers } from '../_shared/push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth.user?.id;
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });
  if (!pushReady())
    return json(503, { error: 'Les notifications ne sont pas encore configurées.' });

  const body = await req.json().catch(() => ({}));

  if (body.type === 'test') {
    const sent = await sendToUsers(admin, [uid], {
      title: 'Notifications activées',
      body: 'Vous recevrez ici vos rappels Connect Team.',
      url: '/profil',
      tag: 'test',
    });
    return json(200, { sent });
  }

  if (body.type === 'review_request') {
    const { data: request } = await admin
      .from('review_requests')
      .select('id, team_id, collaborator_id, message, status')
      .eq('id', String(body.request_id ?? ''))
      .single();
    if (!request || request.collaborator_id !== uid)
      return json(404, { error: 'Demande introuvable.' });
    const [{ data: me }, { data: managers }] = await Promise.all([
      admin.from('profiles').select('first_name, last_name').eq('id', uid).single(),
      admin
        .from('profiles')
        .select('id')
        .eq('team_id', request.team_id)
        .eq('role', 'manager')
        .eq('is_active', true),
    ]);
    const ids = (managers ?? []).map((m: { id: string }) => m.id);
    const { data: muted } = await admin
      .from('notification_prefs')
      .select('user_id')
      .in('user_id', ids)
      .eq('request_alerts', false);
    const targets = ids.filter(
      (id: string) => !(muted ?? []).some((m: { user_id: string }) => m.user_id === id),
    );
    const sent = await sendToUsers(admin, targets, {
      title:
        `${me?.first_name ?? 'Un collaborateur'} ${me?.last_name ?? ''} demande un one-to-one`.trim(),
      body: request.message || 'À planifier depuis la page Entretiens.',
      url: '/entretiens',
      tag: `demande-${request.id}`,
    });
    return json(200, { sent });
  }

  if (body.type === 'absence_request' || body.type === 'absence_decision') {
    const { data: absence } = await admin
      .from('absences')
      .select('id, team_id, collaborator_id, start_date, end_date, status, decision_comment')
      .eq('id', String(body.absence_id ?? ''))
      .single();
    if (!absence) return json(404, { error: 'Demande introuvable.' });
    const day = (iso: string) =>
      new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(
        new Date(`${iso}T12:00:00`),
      );
    const period =
      absence.start_date === absence.end_date
        ? `le ${day(absence.start_date)}`
        : `du ${day(absence.start_date)} au ${day(absence.end_date)}`;

    if (body.type === 'absence_request') {
      // Seul le collaborateur qui vient de poser la demande peut déclencher l'envoi.
      if (absence.collaborator_id !== uid) return json(404, { error: 'Demande introuvable.' });
      const [{ data: me }, { data: managers }] = await Promise.all([
        admin.from('profiles').select('first_name, last_name').eq('id', uid).single(),
        admin
          .from('profiles')
          .select('id')
          .eq('team_id', absence.team_id)
          .eq('role', 'manager')
          .eq('is_active', true),
      ]);
      const ids = (managers ?? []).map((m: { id: string }) => m.id);
      const { data: muted } = await admin
        .from('notification_prefs')
        .select('user_id')
        .in('user_id', ids)
        .eq('request_alerts', false);
      const targets = ids.filter(
        (id: string) => !(muted ?? []).some((m: { user_id: string }) => m.user_id === id),
      );
      const sent = await sendToUsers(admin, targets, {
        title:
          `${me?.first_name ?? 'Un collaborateur'} ${me?.last_name ?? ''} demande un congé`.trim(),
        body: `${period.charAt(0).toUpperCase()}${period.slice(1)} · à valider dans le calendrier.`,
        url: '/calendrier',
        tag: `conge-${absence.id}`,
      });
      return json(200, { sent });
    }

    // Décision : seul un manager de l'équipe peut prévenir le collaborateur.
    const { data: caller } = await admin
      .from('profiles')
      .select('role, team_id')
      .eq('id', uid)
      .single();
    if (
      !caller ||
      caller.role !== 'manager' ||
      caller.team_id !== absence.team_id ||
      absence.status === 'en_attente'
    ) {
      return json(404, { error: 'Demande introuvable.' });
    }
    const accepted = absence.status === 'validee';
    const sent = await sendToUsers(admin, [absence.collaborator_id], {
      title: accepted ? 'Congé accepté' : 'Congé refusé',
      body: `${period.charAt(0).toUpperCase()}${period.slice(1)}${absence.decision_comment ? ` · « ${absence.decision_comment} »` : ''}`,
      url: '/calendrier',
      tag: `conge-${absence.id}-${absence.status}`,
    });
    return json(200, { sent });
  }

  return json(400, { error: 'Type de notification inconnu.' });
});
