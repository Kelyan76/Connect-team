// Edge Function (Deno) : désactivation / réactivation d'un compte collaborateur.
// Le compte est banni côté Auth (plus de connexion possible) et marqué inactif :
// les fonctions RLS ignorent alors ce profil, qui perd tout accès aux données.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// Clés : nouvelles clés secrètes (SUPABASE_SECRET_KEYS) avec repli sur la clé service_role historique.
function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    const first = Object.values(keys)[0];
    if (first) return first;
  } catch {
    // variable absente ou mal formée : repli ci-dessous
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

// La session de l'appelant est vérifiée ici (verify_jwt désactivé, compatible avec les clés de signature asymétriques).
async function callerId(admin: ReturnType<typeof createClient>, req: Request): Promise<string | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(url, secretKey(), { auth: { persistSession: false } });
  const uid = await callerId(admin, req);
  if (!uid) return json(401, { error: 'Session expirée. Reconnectez-vous.' });
  const { data: me } = await admin.from('profiles').select('id, team_id, role, is_active').eq('id', uid).single();
  if (!me || me.role !== 'manager' || !me.is_active) return json(403, { error: 'Seul un manager peut effectuer cette action.' });

  const body = await req.json().catch(() => ({}));
  const userId = String(body.user_id ?? '');
  const action = String(body.action ?? '');
  if (userId === me.id) return json(400, { error: 'Vous ne pouvez pas désactiver votre propre compte.' });
  if (action !== 'desactiver' && action !== 'reactiver') return json(400, { error: 'Action inconnue.' });

  const { data: target } = await admin.from('profiles').select('id').eq('id', userId).eq('team_id', me.team_id).single();
  if (!target) return json(404, { error: 'Collaborateur introuvable.' });

  const active = action === 'reactiver';
  const { error: banError } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' });
  if (banError) return json(400, { error: 'Le compte n’a pas pu être modifié.' });
  await admin.from('profiles').update({ is_active: active }).eq('id', userId);
  return json(200, { ok: true });
});
