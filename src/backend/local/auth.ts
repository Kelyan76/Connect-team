import type { PGlite } from '@electric-sql/pglite';
import { isRecord, json, str, type LocalRequest } from './http';
import { randomToken } from './jwt';
import { sendLocalMail } from './mailbox';
import {
  consumeRefreshToken,
  createSession,
  findUser,
  findUserById,
  isBanned,
  passwordIssue,
  restoreUser,
  revokeSession,
  revokeUser,
  userJson,
} from './users';

const authError = (status: number, code: string, msg: string) => json(status, { code: status, error_code: code, msg });

/** Sous-ensemble de l'API Auth (GoTrue) utilisé par supabase-js, préfixe /auth/v1. */
export async function handleAuth(req: LocalRequest, path: string): Promise<Response> {
  const body = isRecord(req.body) ? req.body : {};
  const { db } = req;

  if (path === '/token' && req.method === 'POST') {
    const grant = req.url.searchParams.get('grant_type');
    if (grant === 'password') {
      const user = await findUser(
        db,
        'lower(email) = lower($1) and encrypted_password is not null and encrypted_password = extensions.crypt($2, encrypted_password)',
        [str(body.email) ?? '', str(body.password) ?? ''],
      );
      if (!user) return authError(400, 'invalid_credentials', 'Invalid login credentials');
      if (isBanned(user)) return authError(400, 'user_banned', 'User is banned');
      if (!user.email_confirmed_at) return authError(400, 'email_not_confirmed', 'Email not confirmed');
      return json(200, await createSession(db, user));
    }
    if (grant === 'refresh_token') {
      const entry = await consumeRefreshToken(str(body.refresh_token) ?? '');
      const user = entry ? await findUserById(db, entry.userId) : null;
      if (!entry || !user) return authError(400, 'refresh_token_not_found', 'Invalid Refresh Token');
      if (isBanned(user)) return authError(400, 'user_banned', 'User is banned');
      return json(200, await createSession(db, user, entry.sessionId));
    }
    return authError(400, 'unsupported_grant_type', 'Unsupported grant type');
  }

  if (path === '/user') {
    if (req.claims.role !== 'authenticated' || !req.claims.sub) return authError(401, 'no_authorization', 'Unauthorized');
    const user = await findUserById(db, req.claims.sub);
    if (!user) return authError(404, 'user_not_found', 'User not found');
    if (req.method === 'GET') return json(200, userJson(user));
    if (req.method === 'PUT') {
      const password = str(body.password);
      if (password !== undefined) {
        const issue = passwordIssue(password);
        if (issue) return authError(422, 'weak_password', issue);
        const same = await findUser(db, 'id = $1 and encrypted_password = extensions.crypt($2, encrypted_password)', [user.id, password]);
        if (same) return authError(422, 'same_password', 'New password should be different from the old password.');
        await db.query(
          "update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = $1",
          [user.id, password],
        );
      }
      const updated = await findUserById(db, user.id);
      return json(200, updated ? userJson(updated) : null);
    }
  }

  if (path === '/logout' && req.method === 'POST') {
    const sid = str(req.claims.session_id);
    if (sid) revokeSession(sid);
    return json(204, null);
  }

  if (path === '/recover' && req.method === 'POST') {
    const user = await findUser(db, 'lower(email) = lower($1)', [str(body.email) ?? '']);
    // Même réponse que le compte existe ou non : pas d'énumération des adresses.
    if (user && !isBanned(user)) {
      const token = randomToken();
      await db.query('update auth.users set recovery_token = $2 where id = $1', [user.id, token]);
      sendLocalMail({
        to: user.email,
        subject: 'Réinitialisation de votre mot de passe Connect Team',
        body: 'Vous avez demandé à réinitialiser votre mot de passe. Ce lien ne fonctionne qu’une fois.',
        link: `/lien?type=recovery&token=${token}`,
      });
    }
    return json(200, {});
  }

  return authError(404, 'not_found', `Route ${req.method} /auth/v1${path} non disponible en démonstration`);
}

/** Vérifie un lien d'e-mail (invitation ou réinitialisation) et ouvre une session. */
export async function verifyEmailLink(db: PGlite, type: string, token: string) {
  const column = type === 'recovery' ? 'recovery_token' : type === 'invite' ? 'confirmation_token' : null;
  if (!column || !token) return null;
  const user = await findUser(db, `${column} = $1`, [token]);
  if (!user) return null;
  await db.query(`update auth.users set ${column} = '', email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1`, [user.id]);
  return createSession(db, user);
}

/** Équivalent local de auth.admin.inviteUserByEmail : compte invité + e-mail d'activation. */
export async function inviteUser(db: PGlite, email: string, data: Record<string, unknown>): Promise<string> {
  const token = randomToken();
  const res = await db.query<{ id: string }>(
    `insert into auth.users (email, invited_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
     values (lower($1), now(), $2, '{"provider":"email","providers":["email"]}', $3::jsonb) returning id`,
    [email, token, JSON.stringify(data)],
  );
  const id = res.rows[0].id;
  await db.query(`insert into auth.identities (provider_id, user_id, identity_data, provider) values ($1::text, $1::uuid, $2::jsonb, 'email')`, [
    id,
    JSON.stringify({ sub: id, email }),
  ]);
  sendLocalMail({
    to: email,
    subject: 'Vous êtes invité sur Connect Team',
    body: 'Votre responsable vous a ouvert un accès à Connect Team. Définissez votre mot de passe pour activer votre compte.',
    link: `/lien?type=invite&token=${token}`,
  });
  return id;
}

export async function setBan(db: PGlite, userId: string, banned: boolean): Promise<void> {
  await db.query("update auth.users set banned_until = case when $2 then now() + interval '100 years' else null end where id = $1", [
    userId,
    banned,
  ]);
  if (banned) revokeUser(userId);
  else restoreUser(userId);
}
