import { jwtVerify, SignJWT } from 'jose';
import type { JwtClaims } from './db';

/** Secret de démonstration (identique à la CLI Supabase locale). Sans valeur en production. */
const key = new TextEncoder().encode('super-secret-jwt-token-with-at-least-32-characters-long');

export const ACCESS_TOKEN_TTL = 3600;

export async function sign(payload: Record<string, unknown>, expiresAt?: number): Promise<string> {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT' });
  if (expiresAt) jwt.setExpirationTime(expiresAt);
  return jwt.sign(key);
}

export async function verify(token: string): Promise<JwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JwtClaims;
  } catch {
    return null;
  }
}

/** Clé « anon » de démonstration, transmise par supabase-js dans l'en-tête apikey. */
export const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export function randomToken(bytes = 20): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}
