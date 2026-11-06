import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite, type Transaction } from '@electric-sql/pglite';

/** Base PGlite côté Node (tests RLS, génération des types) : shim + migrations + seed. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function openTestDatabase({ seed = true } = {}): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(readFileSync(join(ROOT, 'src/backend/local/shim.sql'), 'utf8'));
  await db.exec('set search_path = public, extensions');
  const dir = join(ROOT, 'supabase/migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(join(dir, file), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${file} : ${(error as Error).message}`);
    }
  }
  if (seed) {
    try {
      await db.exec(readFileSync(join(ROOT, 'supabase/seed.sql'), 'utf8'));
    } catch (error) {
      throw new Error(`Seed : ${(error as Error).message}`);
    }
  }
  return db;
}

/** Exécute `fn` en tant qu'utilisateur authentifié (RLS appliquée), puis annule tout. */
export async function asUser<T>(db: PGlite, userId: string | null, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T | undefined;
  const rollback = new Error('rollback');
  try {
    await db.transaction(async (tx) => {
      const claims = userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' };
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
      result = await fn(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  return result as T;
}
