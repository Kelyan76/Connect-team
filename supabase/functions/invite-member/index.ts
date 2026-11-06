// Edge Function (Deno) : invitation d'un collaborateur par son manager.
// Vérifie que l'appelant est manager actif, envoie l'invitation Supabase (e-mail avec lien
// de définition du mot de passe) et crée la fiche profil dans l'équipe du manager.
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
  const email = String(body.email ?? '').trim().toLowerCase();
  const first_name = String(body.first_name ?? '').trim();
  const last_name = String(body.last_name ?? '').trim();
  const job_title = String(body.job_title ?? '').trim();
  const hired_on = body.hired_on ? String(body.hired_on) : null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !first_name || !last_name || job_title.length < 2) {
    return json(400, { error: 'Informations incomplètes ou invalides.' });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? '';
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name },
    redirectTo: `${siteUrl}/nouveau-mot-de-passe`,
  });
  if (error || !invited.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? '');
    return json(exists ? 409 : 400, { error: exists ? 'Un compte existe déjà avec cette adresse e-mail.' : 'L’invitation n’a pas pu être envoyée.' });
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: invited.user.id,
    team_id: me.team_id,
    role: 'collaborateur',
    first_name,
    last_name,
    email,
    job_title,
    hired_on,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return json(400, { error: 'La fiche du collaborateur n’a pas pu être créée.' });
  }
  return json(200, { id: invited.user.id });
});
