// Edge Function (Deno) appelée par l'application, avec la session de l'utilisateur.
// • { type: 'test' } : notification de test sur ses propres appareils.
// • { type: 'review_request', request_id } : le collaborateur vient de demander un one-to-one,
//   son manager est prévenu sur ses appareils (s'il n'a pas désactivé ces alertes).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { pushReady, secretKey, sendToUsers } from '../_shared/push.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), { auth: { persistSession: false } });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth.user?.id;
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });
  if (!pushReady()) return json(503, { error: 'Les notifications ne sont pas encore configurées.' });

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
    if (!request || request.collaborator_id !== uid) return json(404, { error: 'Demande introuvable.' });
    const [{ data: me }, { data: managers }] = await Promise.all([
      admin.from('profiles').select('first_name, last_name').eq('id', uid).single(),
      admin.from('profiles').select('id').eq('team_id', request.team_id).eq('role', 'manager').eq('is_active', true),
    ]);
    const ids = (managers ?? []).map((m: { id: string }) => m.id);
    const { data: muted } = await admin.from('notification_prefs').select('user_id').in('user_id', ids).eq('request_alerts', false);
    const targets = ids.filter((id: string) => !(muted ?? []).some((m: { user_id: string }) => m.user_id === id));
    const sent = await sendToUsers(admin, targets, {
      title: `${me?.first_name ?? 'Un collaborateur'} ${me?.last_name ?? ''} demande un one-to-one`.trim(),
      body: request.message || 'À planifier depuis la page Entretiens.',
      url: '/entretiens',
      tag: `demande-${request.id}`,
    });
    return json(200, { sent });
  }

  return json(400, { error: 'Type de notification inconnu.' });
});
