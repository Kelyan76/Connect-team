// Edge Function (Deno) : inscription d'un manager avec le code d'accès du groupe.
// Crée le compte du manager, des comptes collaborateurs de démonstration (adresses fictives,
// mot de passe commun affiché au manager), puis son équipe pré-remplie (provision_manager_team).
// Secret requis : SIGNUP_CODE (sans lui, les inscriptions sont fermées).
// Règles et formats identiques à src/features/auth/lib/signup.ts (copie : Deno n'importe pas le front).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

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

const DEMO_EMAIL_DOMAIN = 'cadence-demo.example';
const slug = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const randomChars = (alphabet: string, n: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => alphabet[b % alphabet.length]).join('');
const strongPassword = (p: string) =>
  p.length >= 10 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);

// Comparaison à durée constante du code d'accès.
function sameCode(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a.trim().toUpperCase());
  const y = new TextEncoder().encode(b.trim().toUpperCase());
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });

  const expected = Deno.env.get('SIGNUP_CODE') ?? '';
  if (!expected) return json(503, { error: 'Les inscriptions sont fermées pour le moment.' });

  const body = await req.json().catch(() => ({}));
  const s = (k: string, max: number) => String(body[k] ?? '').trim().slice(0, max);
  const v = {
    code: s('code', 100),
    first_name: s('first_name', 60),
    last_name: s('last_name', 60),
    job_title: s('job_title', 80),
    company: s('company', 120),
    team_name: s('team_name', 120),
    email: s('email', 254).toLowerCase(),
    password: String(body.password ?? ''),
  };
  if (!sameCode(v.code, expected)) return json(403, { error: 'Code d’accès incorrect.' });
  if (
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email) || !v.first_name || !v.last_name ||
    v.job_title.length < 2 || v.company.length < 2 || v.team_name.length < 2 || !strongPassword(v.password)
  ) {
    return json(400, { error: 'Informations incomplètes ou invalides.' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey(), { auth: { persistSession: false } });
  const created: string[] = [];
  const rollback = async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id);
  };

  const { data: me, error: meError } = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { first_name: v.first_name, last_name: v.last_name },
  });
  if (meError || !me.user) {
    const exists = /already|registered|exists/i.test(meError?.message ?? '');
    return json(exists ? 409 : 400, { error: exists ? 'Un compte existe déjà avec cette adresse e-mail.' : 'Le compte n’a pas pu être créé.' });
  }
  created.push(me.user.id);

  try {
    const { data: people, error: peopleError } = await admin.rpc('demo_template_people');
    if (peopleError) throw peopleError;
    const tag = randomChars('abcdefghjkmnpqrstuvwxyz23456789', 4);
    const demoPassword = `Demo-${randomChars('abcdefghjkmnpqrstuvwxyz', 6)}-${randomChars('0123456789', 2)}`;
    const demo: { template_id: string; user_id: string; email: string }[] = [];
    for (const p of (people ?? []) as { id: string; first_name: string; last_name: string }[]) {
      const email = `${slug(p.first_name)}.${slug(p.last_name)}.${tag}@${DEMO_EMAIL_DOMAIN}`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { first_name: p.first_name, last_name: p.last_name, demo: true },
      });
      if (error || !data.user) throw error ?? new Error('compte démo');
      created.push(data.user.id);
      demo.push({ template_id: p.id, user_id: data.user.id, email });
    }

    const { error } = await admin.rpc('provision_manager_team', {
      p_manager_id: me.user.id,
      p_first_name: v.first_name,
      p_last_name: v.last_name,
      p_email: v.email,
      p_job_title: v.job_title,
      p_team_name: v.team_name,
      p_company: v.company,
      p_demo: demo,
      p_demo_password: demoPassword,
    });
    if (error) throw error;
  } catch (e) {
    console.error('signup-manager', e);
    await rollback();
    return json(500, { error: 'L’équipe n’a pas pu être créée. Réessayez dans un instant.' });
  }
  return json(200, { ok: true });
});
