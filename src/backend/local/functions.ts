import { demoEmail, demoPassword, demoTag, LOCAL_SIGNUP_CODE, signupSchema } from '@/features/auth/lib/signup';
import { createConfirmedUser, inviteUser, setBan } from './auth';
import { isRecord, json, str, type LocalRequest } from './http';

/**
 * Équivalents locaux des Edge Functions de supabase/functions (même contrat d'entrée/sortie).
 * Elles s'exécutent avec les droits « service_role » après vérification que l'appelant est manager.
 */
interface Caller {
  id: string;
  team_id: string;
}

async function managerCaller(req: LocalRequest): Promise<Caller | null> {
  if (req.claims.role !== 'authenticated' || !req.claims.sub) return null;
  const res = await req.db.query<Caller>(
    "select id, team_id from public.profiles where id = $1 and is_active and role = 'manager'",
    [req.claims.sub],
  );
  return res.rows[0] ?? null;
}

const fail = (status: number, error: string) => json(status, { error });

/** Équivalent local de supabase/functions/signup-manager (appel sans session). */
async function signupManager(req: LocalRequest): Promise<Response> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return fail(400, 'Informations incomplètes ou invalides.');
  const v = parsed.data;
  if (v.code.trim().toUpperCase() !== LOCAL_SIGNUP_CODE) return fail(403, 'Code d’accès incorrect.');
  const email = v.email.trim().toLowerCase();
  const exists = await req.db.query('select 1 from auth.users where lower(email) = $1', [email]);
  if (exists.rows.length) return fail(409, 'Un compte existe déjà avec cette adresse e-mail.');

  await req.db.transaction(async (tx) => {
    const managerId = await createConfirmedUser(tx, email, v.password, { first_name: v.first_name, last_name: v.last_name });
    const people = await tx.query<{ id: string; first_name: string; last_name: string }>('select * from public.demo_template_people()');
    const tag = demoTag();
    const password = demoPassword();
    const demo = [];
    for (const p of people.rows) {
      const demoMail = demoEmail(p.first_name, p.last_name, tag);
      const userId = await createConfirmedUser(tx, demoMail, password, { first_name: p.first_name, last_name: p.last_name });
      demo.push({ template_id: p.id, user_id: userId, email: demoMail });
    }
    const created = await tx.query<{ team: string }>('select public.provision_manager_team($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) as team', [
      managerId,
      v.first_name,
      v.last_name,
      email,
      v.job_title,
      v.team_name,
      v.company,
      JSON.stringify(demo),
      password,
    ]);
    await tx.query('select public.generate_demo_pulses($1)', [created.rows[0].team]);
  });
  return json(200, { ok: true });
}

export async function handleFunction(req: LocalRequest, name: string): Promise<Response> {
  if (name === 'signup-manager') return signupManager(req);
  const caller = await managerCaller(req);
  if (!caller) return fail(403, 'Seul un manager peut effectuer cette action.');
  const body = isRecord(req.body) ? req.body : {};

  if (name === 'invite-member') {
    const email = (str(body.email) ?? '').trim().toLowerCase();
    const firstName = (str(body.first_name) ?? '').trim();
    const lastName = (str(body.last_name) ?? '').trim();
    const jobTitle = (str(body.job_title) ?? '').trim();
    const hiredOn = str(body.hired_on) || null;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !firstName || !lastName || jobTitle.length < 2) {
      return fail(400, 'Informations incomplètes ou invalides.');
    }
    const exists = await req.db.query('select 1 from auth.users where lower(email) = $1', [email]);
    if (exists.rows.length) return fail(409, 'Un compte existe déjà avec cette adresse e-mail.');
    const id = await inviteUser(req.db, email, { first_name: firstName, last_name: lastName });
    await req.db.query(
      `insert into public.profiles (id, team_id, role, first_name, last_name, email, job_title, hired_on)
       values ($1, $2, 'collaborateur', $3, $4, $5, $6, $7)`,
      [id, caller.team_id, firstName, lastName, email, jobTitle, hiredOn],
    );
    return json(200, { id });
  }

  if (name === 'manage-member') {
    const userId = str(body.user_id) ?? '';
    const action = str(body.action);
    if (userId === caller.id) return fail(400, 'Vous ne pouvez pas désactiver votre propre compte.');
    const target = await req.db.query('select 1 from public.profiles where id = $1 and team_id = $2', [userId, caller.team_id]);
    if (!target.rows.length) return fail(404, 'Collaborateur introuvable.');
    if (action !== 'desactiver' && action !== 'reactiver') return fail(400, 'Action inconnue.');
    const active = action === 'reactiver';
    await req.db.query('update public.profiles set is_active = $2 where id = $1', [userId, active]);
    await setBan(req.db, userId, !active);
    return json(200, { ok: true });
  }

  return fail(404, `Fonction ${name} inconnue.`);
}
