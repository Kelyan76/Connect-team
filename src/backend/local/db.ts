import { PGlite, type Transaction } from '@electric-sql/pglite';
import shim from './shim.sql?raw';

/**
 * Base PostgreSQL embarquée dans le navigateur (PGlite) pour la version de démonstration.
 * Elle exécute les mêmes migrations et le même seed que Supabase : la RLS s'applique à l'identique.
 */
const migrations = import.meta.glob('/supabase/migrations/*.sql', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const seeds = import.meta.glob('/supabase/seed.sql', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type DbRole = 'anon' | 'authenticated' | 'service_role';
export interface JwtClaims {
  sub?: string;
  role: DbRole;
  email?: string;
  session_id?: string;
  [key: string]: unknown;
}

/** Empreinte du schéma et du seed : toute modification recrée la base de démonstration. */
function fingerprint(texts: string[]): string {
  let h = 5381;
  for (const text of texts) for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const DB_NAME = `cadence-demo-${fingerprint([...Object.values(migrations), ...Object.values(seeds)])}`;

let instance: Promise<PGlite> | null = null;

/**
 * Système de fichiers initial de PostgreSQL, servi sous une extension standard (.wasm)
 * pour être diffusable partout (copié dans public/ par `npm run pglite:copy`).
 * Côté Node (tests), PGlite le charge lui-même depuis node_modules.
 */
async function loadFsBundle(): Promise<Blob | undefined> {
  if (typeof document === 'undefined') return undefined;
  // Depuis la racine de l'application (BASE_URL), pas depuis la page courante : sinon un rechargement
  // sur /entretiens/… demanderait /entretiens/pglite-fs.wasm et recevrait la page HTML.
  const res = await fetch(new URL(`${import.meta.env.BASE_URL}pglite-fs.wasm`, document.baseURI));
  if (!res.ok) throw new Error('Les fichiers de la base de démonstration sont introuvables.');
  return res.blob();
}

function storageTarget(): string | undefined {
  // Mode mémoire pour les tests (base neuve à chaque chargement), IndexedDB sinon.
  if (import.meta.env.VITE_LOCAL_DB === 'memory') return undefined;
  return typeof indexedDB === 'undefined' ? undefined : `idb://${DB_NAME}`;
}

async function bootstrap(dataDir: string | undefined): Promise<PGlite> {
  const db = await PGlite.create({ dataDir, fsBundle: await loadFsBundle() });
  const probe = await db.query<{ t: string | null }>("select to_regclass('supalite.migrations')::text as t");
  const fresh = probe.rows[0]?.t === null;
  if (fresh) await db.exec(shim);
  // Comme sur Supabase : les fonctions de pgcrypto sont dans le schéma extensions.
  await db.exec('set search_path = public, extensions');

  const applied = new Set((await db.query<{ name: string }>('select name from supalite.migrations')).rows.map((r) => r.name));
  for (const path of Object.keys(migrations).sort()) {
    const name = path.split('/').pop() ?? path;
    if (applied.has(name)) continue;
    // Tout ou rien : une page rechargée en pleine création ne laisse pas une migration à moitié appliquée.
    await db.transaction(async (tx) => {
      await tx.exec(migrations[path]);
      await tx.query('insert into supalite.migrations (name) values ($1)', [name]);
    });
  }
  const seed = Object.values(seeds)[0];
  if (fresh && seed) await db.exec(seed);
  return db;
}

export function getDb(): Promise<PGlite> {
  instance ??= bootstrap(storageTarget()).catch((error: unknown) => {
    instance = null;
    throw error;
  });
  return instance;
}

/** Efface la base locale (IndexedDB) : le prochain chargement recrée le jeu de démonstration. */
export async function resetLocalDatabase(): Promise<void> {
  const db = await getDb();
  await db.close();
  instance = null;
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(`/pglite/${DB_NAME}`);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}

/** Exécute `fn` sous le rôle PostgREST des claims, comme PostgREST (set local role + request.jwt.claims). */
export async function withClaims<T>(db: PGlite, claims: JwtClaims, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const role: DbRole = claims.role === 'authenticated' || claims.role === 'service_role' ? claims.role : 'anon';
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    await tx.exec(`set local role ${role}`);
    return fn(tx);
  });
}
