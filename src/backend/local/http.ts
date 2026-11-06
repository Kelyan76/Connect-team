import type { PGlite } from '@electric-sql/pglite';
import type { JwtClaims } from './db';

export interface LocalRequest {
  method: string;
  url: URL;
  headers: Headers;
  body: unknown;
  claims: JwtClaims;
  db: PGlite;
}

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

interface PgError {
  code?: string;
  message?: string;
  detail?: string;
  hint?: string;
}

/** Erreur PostgreSQL → réponse au format PostgREST. */
export function pgError(error: unknown, authenticated: boolean): Response {
  const e = (error ?? {}) as PgError;
  const code = e.code ?? 'XX000';
  let status = 400;
  if (code === '42501') status = authenticated ? 403 : 401;
  else if (code === '23505' || code === '23503') status = 409;
  else if (code === '42P01' || code === '42883') status = 404;
  else if (code === 'PGRST116') status = 406;
  return json(status, { code, message: e.message ?? 'Erreur', details: e.detail ?? null, hint: e.hint ?? null });
}
