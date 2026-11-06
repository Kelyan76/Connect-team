import { writeFileSync } from 'node:fs';
import { openTestDatabase } from './db-node';

/**
 * Génère src/shared/types/database.ts au format de `supabase gen types typescript`,
 * en introspectant le schéma public après application des migrations (sans Docker).
 * Avec un projet Supabase : `npx supabase gen types typescript --project-id <id>` produit l'équivalent.
 */
const db = await openTestDatabase({ seed: false });

const enums = (
  await db.query<{ name: string; labels: string[] }>(`
    select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`)
).rows;
const enumNames = new Set(enums.map((e) => e.name));

function tsType(udt: string): string {
  const array = udt.startsWith('_');
  const base = array ? udt.slice(1) : udt;
  let t: string;
  if (enumNames.has(base)) t = `Database['public']['Enums']['${base}']`;
  else if (['int2', 'int4', 'int8', 'float4', 'float8', 'numeric'].includes(base)) t = 'number';
  else if (base === 'bool') t = 'boolean';
  else if (base === 'json' || base === 'jsonb') t = 'Json';
  else t = 'string';
  return array ? `${t}[]` : t;
}

interface Col {
  table_name: string;
  column_name: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  is_identity: string;
  kind: string;
}
const cols = (
  await db.query<Col>(`
    select c.table_name, c.column_name, c.udt_name, c.is_nullable, c.column_default, c.is_identity,
      (select case when t.table_type = 'VIEW' then 'view' else 'table' end from information_schema.tables t
        where t.table_schema = 'public' and t.table_name = c.table_name) as kind
    from information_schema.columns c where c.table_schema = 'public' order by c.table_name, c.ordinal_position`)
).rows;

const tables = new Map<string, Col[]>();
for (const c of cols) tables.set(c.table_name, [...(tables.get(c.table_name) ?? []), c]);

const fns = (
  await db.query<{ name: string; args: string[] | null; types: string[]; ndefaults: number; ret: string; retset: boolean }>(`
    select p.proname::text as name, p.proargnames::text[] as args,
      array(select t.typname::text from unnest(p.proargtypes::oid[]) with ordinality a(oid, i) join pg_type t on t.oid = a.oid order by a.i) as types, p.pronargdefaults::int as ndefaults,
      rt.typname::text as ret, p.proretset as retset
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type rt on rt.oid = p.prorettype
    where n.nspname = 'public' and rt.typname <> 'trigger' order by p.proname`)
).rows;

const out: string[] = [];
out.push('// Fichier généré par `npm run db:types` — ne pas modifier à la main.');
out.push('export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];');
out.push('');
out.push('export type Database = {');
out.push('  public: {');
for (const kind of ['table', 'view'] as const) {
  out.push(`    ${kind === 'table' ? 'Tables' : 'Views'}: {`);
  for (const [name, columns] of tables) {
    if (columns[0].kind !== kind) continue;
    out.push(`      ${name}: {`);
    out.push('        Row: {');
    for (const c of columns) out.push(`          ${c.column_name}: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''};`);
    out.push('        };');
    if (kind === 'table') {
      for (const variant of ['Insert', 'Update'] as const) {
        out.push(`        ${variant}: {`);
        for (const c of columns) {
          const optional = variant === 'Update' || c.is_nullable === 'YES' || c.column_default !== null || c.is_identity === 'YES';
          out.push(`          ${c.column_name}${optional ? '?' : ''}: ${tsType(c.udt_name)}${c.is_nullable === 'YES' ? ' | null' : ''};`);
        }
        out.push('        };');
      }
    }
    out.push('        Relationships: [];');
    out.push('      };');
  }
  out.push('    };');
}
out.push('    Functions: {');
for (const f of fns) {
  const names = f.args ?? [];
  const args = names.map((a, i) => `${a}${i >= names.length - f.ndefaults ? '?' : ''}: ${tsType(f.types[i])}`).join('; ');
  const ret = f.ret === 'void' ? 'undefined' : tsType(f.ret);
  out.push(`      ${f.name}: { Args: ${args ? `{ ${args} }` : 'Record<PropertyKey, never>'}; Returns: ${f.retset ? `${ret}[]` : ret} };`);
}
out.push('    };');
out.push('    Enums: {');
for (const e of enums) out.push(`      ${e.name}: ${e.labels.map((l) => `'${l}'`).join(' | ')};`);
out.push('    };');
out.push('    CompositeTypes: { [_ in never]: never };');
out.push('  };');
out.push('};');
out.push('');
out.push("type PublicSchema = Database['public'];");
out.push("export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];");
out.push("export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];");
out.push("export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];");
out.push("export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];");
out.push('');

writeFileSync(new URL('../src/shared/types/database.ts', import.meta.url), out.join('\n'));
console.info(`Types générés : ${tables.size} tables, ${fns.length} fonctions, ${enums.length} énumérations.`);
