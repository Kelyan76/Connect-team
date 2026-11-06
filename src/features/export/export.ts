import { listTable } from '@/shared/lib/crud';
import { downloadFile, toCsv } from '@/shared/lib/csv';
import { todayIso } from '@/shared/lib/dates';

/** Tables exportables, dans l'ordre de restauration. La RLS limite l'export à ce que l'utilisateur peut lire. */
export const EXPORT_TABLES = [
  { name: 'profiles', label: 'Collaborateurs', order: 'last_name' },
  { name: 'objectives', label: 'Objectifs', order: 'due_date' },
  { name: 'key_results', label: 'Résultats clés', order: 'objective_id' },
  { name: 'skills', label: 'Compétences', order: 'name' },
  { name: 'skill_levels', label: 'Niveaux de compétence', order: 'skill_id' },
  { name: 'reviews', label: 'Entretiens', order: 'scheduled_at' },
  { name: 'review_answers', label: 'Réponses aux entretiens', order: 'review_id' },
  { name: 'review_actions', label: 'Actions d’entretien', order: 'created_at' },
  { name: 'feedbacks', label: 'Feedbacks', order: 'created_at' },
  { name: 'weather_entries', label: 'Météo', order: 'week_start' },
  { name: 'tasks', label: 'Tâches', order: 'created_at' },
  { name: 'projects', label: 'Projets', order: 'code' },
  { name: 'workload_allocations', label: 'Plan de charge', order: 'week_start' },
  { name: 'absences', label: 'Absences', order: 'start_date' },
  { name: 'meetings', label: 'Réunions', order: 'held_on' },
  { name: 'decisions', label: 'Décisions', order: 'created_at' },
  { name: 'meeting_actions', label: 'Actions de réunion', order: 'created_at' },
  { name: 'delegations', label: 'Délégations', order: 'domain_id' },
  { name: 'manager_notes', label: 'Notes privées', order: 'created_at' },
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number]['name'];

export async function exportJson(): Promise<number> {
  const entries = await Promise.all(EXPORT_TABLES.map(async (t) => [t.name, await listTable(t.name, t.order)] as const));
  const payload = { application: 'Connect Team', exported_at: new Date().toISOString(), tables: Object.fromEntries(entries) };
  downloadFile(JSON.stringify(payload, null, 2), `connect-team-sauvegarde-${todayIso()}.json`, 'application/json');
  return entries.reduce((n, [, rows]) => n + rows.length, 0);
}

export async function exportCsv(table: ExportTable): Promise<number> {
  const def = EXPORT_TABLES.find((t) => t.name === table);
  if (!def) return 0;
  const rows = (await listTable(def.name, def.order)) as unknown as Record<string, string | number | boolean | null | object>[];
  downloadFile(toCsv(rows), `connect-team-${table}-${todayIso()}.csv`, 'text/csv;charset=utf-8');
  return rows.length;
}
