// Edge Function (Deno) : visio intégrée d'un 1 à 1, servie par LiveKit Cloud (offre gratuite, sans carte).
// • { review_id } → { url, token } : salle propre à l'entretien (créée automatiquement à la connexion)
//   et jeton nominatif signé ici. Seuls le manager et le collaborateur de l'entretien en obtiennent un.
// • L'autre participant est prévenu sur ses appareils (« … vous attend en visio »).
// Secrets requis (Supabase › Edge Functions › Secrets) : LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
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

const b64url = (data: string | ArrayBuffer) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Jeton d'accès LiveKit : JWT HS256 signé avec la clé secrète du projet (format officiel LiveKit). */
async function livekitToken(
  apiKey: string,
  apiSecret: string,
  claims: Record<string, unknown>,
): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: apiKey, ...claims }));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(signature)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('LIVEKIT_URL') ?? '';
  const apiKey = Deno.env.get('LIVEKIT_API_KEY') ?? '';
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET') ?? '';
  if (!url || !apiKey || !apiSecret)
    return json(503, { error: 'La visio n’est pas encore configurée.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), {
    auth: { persistSession: false },
  });
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(bearer);
  const uid = auth.user?.id;
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });

  const body = await req.json().catch(() => ({}));
  const { data: review } = await admin
    .from('reviews')
    .select('id, manager_id, collaborator_id, status')
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
  const now = Math.floor(Date.now() / 1000);
  const token = await livekitToken(apiKey, apiSecret, {
    sub: uid,
    name: me ? `${me.first_name} ${me.last_name}` : 'Participant',
    nbf: now - 10,
    exp: now + 4 * 3600,
    video: {
      room: `ct-${review.id}`,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: review.manager_id === uid,
    },
  });

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

  return json(200, { url, token });
});
