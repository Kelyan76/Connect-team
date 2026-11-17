// Edge Function (Deno) : visio intégrée d'un 1 à 1, servie par Daily (https://daily.co, offre gratuite).
// • { review_id } → { url, token } : salle privée propre à l'entretien et jeton nominatif.
//   Seuls le manager et le collaborateur de l'entretien obtiennent un jeton ; le manager est « propriétaire ».
// • L'autre participant est prévenu sur ses appareils (« … vous attend en visio »).
// Secret requis : DAILY_API_KEY (Supabase › Edge Functions › Secrets). Sans lui, la visio est indisponible.
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

const DAILY = 'https://api.daily.co/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const apiKey = Deno.env.get('DAILY_API_KEY') ?? '';
  if (!apiKey) return json(503, { error: 'La visio n’est pas encore configurée.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
    auth: { persistSession: false },
  });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth.user?.id;
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });

  const body = await req.json().catch(() => ({}));
  const { data: review } = await admin
    .from('reviews')
    .select('id, manager_id, collaborator_id, scheduled_at, duration_minutes, status')
    .eq('id', String(body.review_id ?? ''))
    .single();
  if (!review || (review.manager_id !== uid && review.collaborator_id !== uid))
    return json(404, { error: 'Entretien introuvable.' });
  if (review.status === 'annule') return json(400, { error: 'Cet entretien est annulé.' });

  const { data: me } = await admin
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', uid)
    .single();
  const daily = (path: string, init?: RequestInit) =>
    fetch(`${DAILY}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });

  // Salle valable jusqu'à 3 h après la fin prévue (et au moins 2 h à partir de maintenant).
  const end = new Date(review.scheduled_at).getTime() + (review.duration_minutes + 180) * 60_000;
  const exp = Math.floor(Math.max(end, Date.now() + 2 * 3600_000) / 1000);
  const name = `ct-${review.id}`;
  const properties = {
    exp,
    lang: 'fr',
    enable_prejoin_ui: true,
    enable_chat: true,
    max_participants: 4,
  };

  // Récupère la salle (et prolonge sa validité) ou la crée.
  let room = await daily(`/rooms/${name}`);
  if (room.ok)
    room = await daily(`/rooms/${name}`, { method: 'POST', body: JSON.stringify({ properties }) });
  else
    room = await daily('/rooms', {
      method: 'POST',
      body: JSON.stringify({ name, privacy: 'private', properties }),
    });
  if (!room.ok) {
    console.error('daily room', room.status, await room.text());
    return json(502, { error: 'La salle de visio n’a pas pu être créée. Réessayez.' });
  }
  const { url } = (await room.json()) as { url: string };

  const meeting = await daily('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: name,
        user_name: me ? `${me.first_name} ${me.last_name}` : 'Participant',
        user_id: uid.slice(0, 36),
        is_owner: review.manager_id === uid,
        exp,
        lang: 'fr',
      },
    }),
  });
  if (!meeting.ok) {
    console.error('daily token', meeting.status, await meeting.text());
    return json(502, { error: 'Accès à la visio impossible. Réessayez.' });
  }
  const { token: meetingToken } = (await meeting.json()) as { token: string };

  // Prévient l'autre participant (sans bloquer).
  if (pushReady() && body.notify !== false) {
    const other = review.manager_id === uid ? review.collaborator_id : review.manager_id;
    await sendToUsers(admin, [other], {
      title: `${me?.first_name ?? 'Votre interlocuteur'} vous attend en visio`,
      body: 'Votre 1 à 1 commence : rejoignez la visio depuis l’entretien.',
      url: `/entretiens/${review.id}?visio=1`,
      tag: `visio-${review.id}`,
    }).catch(() => 0);
  }

  return json(200, { url, token: meetingToken });
});
