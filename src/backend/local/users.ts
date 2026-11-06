import type { PGlite } from '@electric-sql/pglite';
import { ACCESS_TOKEN_TTL, sign, verify } from './jwt';

export interface AuthUserRow {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  invited_at: string | null;
  last_sign_in_at: string | null;
  raw_app_meta_data: Record<string, unknown> | null;
  raw_user_meta_data: Record<string, unknown> | null;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

const COLS =
  'id, email, email_confirmed_at, invited_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, banned_until, created_at, updated_at';

export async function findUser(db: PGlite, where: string, params: unknown[]): Promise<AuthUserRow | null> {
  const res = await db.query<AuthUserRow>(`select ${COLS} from auth.users where ${where} limit 1`, params);
  return res.rows[0] ?? null;
}
export const findUserById = (db: PGlite, id: string) => findUser(db, 'id = $1', [id]);

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : ((v as string | null) ?? null));

export function userJson(u: AuthUserRow) {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email,
    email_confirmed_at: iso(u.email_confirmed_at),
    confirmed_at: iso(u.email_confirmed_at),
    invited_at: iso(u.invited_at),
    last_sign_in_at: iso(u.last_sign_in_at),
    phone: '',
    app_metadata: u.raw_app_meta_data ?? { provider: 'email', providers: ['email'] },
    user_metadata: u.raw_user_meta_data ?? {},
    identities: [],
    created_at: iso(u.created_at),
    updated_at: iso(u.updated_at),
    is_anonymous: false,
  };
}

/** Règles de mot de passe (identiques à supabase/config.toml). */
export function passwordIssue(password: string): string | null {
  if (password.length < 10) return 'Password should be at least 10 characters.';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return 'Password should contain at least one character of each: lowercase, uppercase, digit, symbol.';
  }
  return null;
}

const revokedSessions = new Set<string>();
const revokedUsers = new Set<string>();

export async function createSession(db: PGlite, user: AuthUserRow, sessionId: string = crypto.randomUUID()) {
  await db.query('update auth.users set last_sign_in_at = now() where id = $1', [user.id]);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + ACCESS_TOKEN_TTL;
  const accessToken = await sign(
    {
      sub: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      session_id: sessionId,
      iat: now,
      app_metadata: user.raw_app_meta_data ?? {},
      user_metadata: user.raw_user_meta_data ?? {},
    },
    expiresAt,
  );
  // Jeton de rafraîchissement signé : il survit au rechargement de la page.
  const refreshToken = await sign({ sub: user.id, session_id: sessionId, typ: 'refresh', iat: now }, now + 30 * 86400);
  const fresh = (await findUserById(db, user.id)) ?? user;
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: ACCESS_TOKEN_TTL,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: userJson(fresh),
  };
}

export async function consumeRefreshToken(token: string) {
  const claims = await verify(token);
  if (!claims || claims.typ !== 'refresh' || !claims.sub || !claims.session_id) return null;
  if (revokedSessions.has(claims.session_id) || revokedUsers.has(claims.sub)) return null;
  return { userId: claims.sub, sessionId: claims.session_id };
}

export const revokeSession = (sessionId: string) => void revokedSessions.add(sessionId);
export const revokeUser = (userId: string) => void revokedUsers.add(userId);
export const restoreUser = (userId: string) => void revokedUsers.delete(userId);

export const isBanned = (u: AuthUserRow) => u.banned_until !== null && new Date(u.banned_until) > new Date();
