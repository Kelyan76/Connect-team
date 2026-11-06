import { handleAuth } from './auth';
import { getDb, type JwtClaims } from './db';
import { handleFunction } from './functions';
import { json, type LocalRequest } from './http';
import { verify } from './jwt';
import { handleRest } from './rest';

/** URL fictive du backend local : supabase-js y envoie ses requêtes, interceptées ci-dessous. */
export const LOCAL_SUPABASE_URL = 'https://cadence.local';

async function claimsFrom(headers: Headers): Promise<JwtClaims> {
  const bearer = headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? headers.get('apikey') ?? '';
  return (await verify(bearer)) ?? { role: 'anon' };
}

async function parseBody(request: Request): Promise<unknown> {
  if (request.method === 'GET' || request.method === 'HEAD') return null;
  const text = await request.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * `fetch` de remplacement passé à createClient : route /auth/v1, /rest/v1 et /functions/v1
 * vers le backend embarqué. Toute autre URL part sur le réseau normalement.
 */
export const localFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin !== LOCAL_SUPABASE_URL) return fetch(input, init);

  const db = await getDb();
  const req: LocalRequest = {
    method: request.method,
    url,
    headers: request.headers,
    body: await parseBody(request),
    claims: await claimsFrom(request.headers),
    db,
  };
  const path = url.pathname;
  try {
    if (path.startsWith('/auth/v1')) return await handleAuth(req, path.slice('/auth/v1'.length));
    if (path.startsWith('/rest/v1')) return await handleRest(req, path.slice('/rest/v1'.length));
    if (path.startsWith('/functions/v1/')) return await handleFunction(req, path.slice('/functions/v1/'.length));
    return json(404, { message: 'Ressource inconnue' });
  } catch (error) {
    console.error('Backend local', error);
    return json(500, { message: error instanceof Error ? error.message : 'Erreur interne' });
  }
};
