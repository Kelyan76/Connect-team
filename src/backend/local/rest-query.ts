/**
 * Traduction des paramètres PostgREST (select, filtres, order, limit) en SQL paramétré.
 * Sous-ensemble utilisé par l'application ; le reste est refusé explicitement.
 */
const IDENT = /^[a-z_][a-z0-9_]*$/;
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and']);

export class QueryError extends Error {
  readonly code = 'PGRST100';
}

export function ident(name: string): string {
  if (!IDENT.test(name)) throw new QueryError(`Identifiant invalide : ${name}`);
  return `"${name}"`;
}

export function parseSelect(select: string | null): string {
  if (!select || select.trim() === '*') return '*';
  if (select.includes('(')) throw new QueryError("L'embedding PostgREST n'est pas pris en charge : utiliser une requête séparée.");
  return select
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map(ident)
    .join(', ');
}

export class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function splitList(inner: string): string[] {
  const items: string[] = [];
  let current = '';
  let quoted = false;
  let depth = 0;
  for (const ch of inner) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === '(') depth += 1;
    else if (!quoted && ch === ')') depth -= 1;
    if (ch === ',' && !quoted && depth === 0) {
      items.push(current);
      current = '';
    } else if (ch !== '"') current += ch;
  }
  items.push(current);
  return items;
}

const OPS: Record<string, string> = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };

export function condition(column: string, expr: string, params: Params): string {
  const col = ident(column);
  let negate = false;
  let rest = expr;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const dot = rest.indexOf('.');
  if (dot < 0) throw new QueryError(`Filtre invalide : ${column}=${expr}`);
  const op = rest.slice(0, dot);
  const value = rest.slice(dot + 1);
  let sql: string;
  if (op in OPS) sql = `${col} ${OPS[op]} ${params.add(value)}`;
  else if (op === 'like' || op === 'ilike') sql = `${col}::text ${op} ${params.add(value.replace(/\*/g, '%'))}`;
  else if (op === 'is') {
    const v = value.toLowerCase();
    if (!['null', 'true', 'false'].includes(v)) throw new QueryError(`Valeur is invalide : ${value}`);
    sql = `${col} is ${v}`;
  } else if (op === 'in') {
    const inner = value.replace(/^\(/, '').replace(/\)$/, '');
    const items = inner === '' ? [] : splitList(inner);
    sql = items.length === 0 ? 'false' : `${col}::text = any(${params.add(items)}::text[])`;
  } else if (op === 'cs') sql = `${col} @> ${params.add(value)}`;
  else throw new QueryError(`Opérateur non pris en charge : ${op}`);
  return negate ? `not (${sql})` : sql;
}

function logical(value: string, joiner: 'or' | 'and', params: Params): string {
  const inner = value.replace(/^\(/, '').replace(/\)$/, '');
  const parts = splitList(inner).map((item) => {
    const dot = item.indexOf('.');
    return condition(item.slice(0, dot), item.slice(dot + 1), params);
  });
  return `(${parts.join(` ${joiner} `)})`;
}

export function whereClause(search: URLSearchParams, params: Params): string {
  const parts: string[] = [];
  for (const [key, value] of search) {
    if (key === 'or' || key === 'and') parts.push(logical(value, key, params));
    else if (!RESERVED.has(key)) parts.push(condition(key, value, params));
  }
  return parts.length ? `where ${parts.join(' and ')}` : '';
}

export function orderClause(order: string | null): string {
  if (!order) return '';
  const items = order.split(',').map((item) => {
    const [col, ...mods] = item.split('.');
    let sql = ident(col);
    for (const m of mods) {
      if (m === 'asc' || m === 'desc') sql += ` ${m}`;
      else if (m === 'nullsfirst') sql += ' nulls first';
      else if (m === 'nullslast') sql += ' nulls last';
      else throw new QueryError(`Tri invalide : ${item}`);
    }
    return sql;
  });
  return `order by ${items.join(', ')}`;
}

export function limitClause(search: URLSearchParams): string {
  const limit = search.get('limit');
  const offset = search.get('offset');
  let sql = '';
  if (limit && /^\d+$/.test(limit)) sql += ` limit ${limit}`;
  if (offset && /^\d+$/.test(offset)) sql += ` offset ${offset}`;
  return sql;
}

export function parsePrefer(header: string | null) {
  const prefs = new Set((header ?? '').split(',').map((p) => p.trim()));
  return {
    representation: prefs.has('return=representation'),
    count: [...prefs].some((p) => p.startsWith('count=')),
    merge: prefs.has('resolution=merge-duplicates'),
    ignore: prefs.has('resolution=ignore-duplicates'),
  };
}
