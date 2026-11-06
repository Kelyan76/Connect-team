import type { Transaction } from '@electric-sql/pglite';
import { withClaims } from './db';
import { isRecord, json, pgError, type LocalRequest } from './http';
import { ident, limitClause, orderClause, Params, parsePrefer, parseSelect, QueryError, whereClause } from './rest-query';

const SINGLE = 'application/vnd.pgrst.object+json';

async function rows(tx: Transaction, sql: string, values: unknown[]): Promise<unknown[]> {
  const res = await tx.query<{ r: unknown }>(`select to_jsonb(s) as r from (${sql}) s`, values);
  return res.rows.map((x) => x.r);
}

/** Écritures : la CTE modifiante doit rester au premier niveau de la requête. */
async function writeRows(tx: Transaction, cte: string, cols: string, values: unknown[]): Promise<unknown[]> {
  const res = await tx.query<{ r: unknown }>(`with w as (${cte}) select to_jsonb(x) as r from (select ${cols} from w) x`, values);
  return res.rows.map((x) => x.r);
}

function respond(req: LocalRequest, data: unknown[], status: number, total?: number): Response {
  const headers: Record<string, string> = {};
  if (total !== undefined) headers['content-range'] = `${data.length ? `0-${data.length - 1}` : '*'}/${total}`;
  if ((req.headers.get('accept') ?? '').includes(SINGLE)) {
    if (data.length !== 1) {
      return json(406, {
        code: 'PGRST116',
        message: 'JSON object requested, multiple (or no) rows returned',
        details: `The result contains ${data.length} rows`,
        hint: null,
      });
    }
    return json(status, data[0], headers);
  }
  if (req.method === 'HEAD') return new Response(null, { status: 200, headers });
  return json(status, data, headers);
}

async function handleTable(req: LocalRequest, table: string, tx: Transaction): Promise<Response> {
  const t = `public.${ident(table)}`;
  const search = req.url.searchParams;
  const prefer = parsePrefer(req.headers.get('prefer'));
  const cols = parseSelect(search.get('select'));
  const params = new Params();

  if (req.method === 'GET' || req.method === 'HEAD') {
    const where = whereClause(search, params);
    const data = await rows(tx, `select ${cols} from ${t} ${where} ${orderClause(search.get('order'))} ${limitClause(search)}`, params.values);
    let total: number | undefined;
    if (prefer.count) {
      const c = await tx.query<{ n: number }>(`select count(*)::int as n from ${t} ${where}`, params.values);
      total = c.rows[0].n;
    }
    return respond(req, data, 200, total);
  }

  if (req.method === 'POST') {
    const list = Array.isArray(req.body) ? req.body : [req.body];
    if (!list.every(isRecord)) throw new QueryError('Corps de requête invalide');
    const keys = Array.from(new Set(list.flatMap((r) => Object.keys(r)))).map(ident);
    const payload = params.add(JSON.stringify(list));
    let conflict = '';
    const onConflict = search.get('on_conflict');
    if (prefer.merge || prefer.ignore) {
      const target = onConflict ? `(${onConflict.split(',').map(ident).join(', ')})` : '';
      conflict = prefer.ignore
        ? `on conflict ${target} do nothing`
        : `on conflict ${target} do update set ${keys.map((k) => `${k} = excluded.${k}`).join(', ')}`;
    }
    const cte = `insert into ${t} (${keys.join(', ')})
      select ${keys.join(', ')} from jsonb_populate_recordset(null::${t}, ${payload}::jsonb) ${conflict} returning *`;
    const data = await writeRows(tx, cte, cols, params.values);
    return prefer.representation ? respond(req, data, 201) : json(201, null);
  }

  if (req.method === 'PATCH') {
    if (!isRecord(req.body)) throw new QueryError('Corps de requête invalide');
    const keys = Object.keys(req.body).map(ident);
    const payload = params.add(JSON.stringify(req.body));
    const where = whereClause(search, params);
    const cte = `update ${t} set (${keys.join(', ')}) =
      (select ${keys.join(', ')} from jsonb_populate_record(null::${t}, ${payload}::jsonb)) ${where} returning *`;
    const data = await writeRows(tx, cte, cols, params.values);
    return prefer.representation ? respond(req, data, 200) : json(204, null);
  }

  if (req.method === 'DELETE') {
    const where = whereClause(search, params);
    if (!where) throw new QueryError('Suppression sans filtre refusée');
    const data = await writeRows(tx, `delete from ${t} ${where} returning *`, cols, params.values);
    return prefer.representation ? respond(req, data, 200) : json(204, null);
  }
  return json(405, { message: 'Méthode non prise en charge' });
}

interface FnInfo {
  argnames: string[] | null;
  argtypes: string[];
  retset: boolean;
  composite: boolean;
  isvoid: boolean;
}

async function handleRpc(req: LocalRequest, fn: string, tx: Transaction): Promise<Response> {
  const info = await tx.query<FnInfo>(
    `select p.proargnames as argnames,
            array(select format_type(t, null) from unnest(p.proargtypes::oid[]) t) as argtypes,
            p.proretset as retset, ty.typtype = 'c' as composite, ty.typname = 'void' as isvoid
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type ty on ty.oid = p.prorettype
     where n.nspname = 'public' and p.proname = $1 limit 1`,
    [fn],
  );
  const f = info.rows[0];
  if (!f) return json(404, { code: 'PGRST202', message: `Fonction ${fn} introuvable`, details: null, hint: null });
  const args = isRecord(req.body) ? req.body : {};
  const params = new Params();
  const parts: string[] = [];
  (f.argnames ?? []).forEach((name, i) => {
    if (!(name in args)) return;
    const v = args[name];
    const value = v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : String(v);
    parts.push(`${ident(name)} => ${params.add(value)}::${f.argtypes[i]}`);
  });
  const call = `public.${ident(fn)}(${parts.join(', ')})`;
  if (f.retset || f.composite) {
    return respond(req, await rows(tx, `select * from ${call}`, params.values), 200);
  }
  const res = await tx.query<{ r: unknown }>(`select to_jsonb(${call}) as r`, params.values);
  if (f.isvoid) return json(200, null);
  return json(200, res.rows[0]?.r ?? null);
}

/** Point d'entrée /rest/v1 : exécute la requête sous le rôle de l'appelant (RLS appliquée). */
export async function handleRest(req: LocalRequest, path: string): Promise<Response> {
  try {
    return await withClaims(req.db, req.claims, (tx) => {
      const rpc = path.match(/^\/rpc\/([a-z_][a-z0-9_]*)$/);
      if (rpc) return handleRpc(req, rpc[1], tx);
      const table = path.match(/^\/([a-z_][a-z0-9_]*)$/);
      if (table) return handleTable(req, table[1], tx);
      return Promise.resolve(json(404, { message: 'Ressource inconnue' }));
    });
  } catch (error) {
    if (error instanceof QueryError) return json(400, { code: error.code, message: error.message, details: null, hint: null });
    return pgError(error, req.claims.role === 'authenticated');
  }
}
