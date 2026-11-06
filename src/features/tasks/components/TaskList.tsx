import type { Person } from '@/features/team/api';
import { useSort } from '@/shared/hooks/use-sort';
import { todayIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { SortableTh, Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import type { Tables } from '@/shared/types/database';
import { PRIORITY, TASK_STATUS, type Task } from '../queries';

/** Vue liste triable, alternative au kanban. */
export function TaskList({ tasks, projects, byId, onOpen }: { tasks: Task[]; projects: Tables<'projects'>[]; byId: Map<string, Person>; onOpen: (t: Task) => void }) {
  const today = todayIso();
  const { sorted, sort, toggle } = useSort(
    tasks,
    {
      title: (t) => t.title,
      project: (t) => projects.find((p) => p.id === t.project_id)?.code,
      priority: (t) => PRIORITY[t.priority].rank,
      status: (t) => TASK_STATUS.findIndex((s) => s.id === t.status),
      due: (t) => t.due_date,
    },
    { key: 'due', direction: 'asc' },
  );
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="Aucune tâche" description="Aucune tâche ne correspond aux filtres choisis." />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-surface">
      <Table>
        <THead>
          <tr>
            <SortableTh label="Tâche" sortKey="title" sort={sort} onSort={toggle} />
            <SortableTh label="Projet" sortKey="project" sort={sort} onSort={toggle} />
            <Th>Responsable</Th>
            <SortableTh label="Priorité" sortKey="priority" sort={sort} onSort={toggle} />
            <SortableTh label="Statut" sortKey="status" sort={sort} onSort={toggle} />
            <SortableTh label="Échéance" sortKey="due" sort={sort} onSort={toggle} align="right" />
          </tr>
        </THead>
        <TBody>
          {sorted.map((t) => {
            const p = t.assignee_id ? byId.get(t.assignee_id) : undefined;
            const late = t.status !== 'termine' && t.due_date !== null && t.due_date < today;
            return (
              <Tr key={t.id} className="cursor-pointer" onClick={() => onOpen(t)}>
                <Td className="font-medium">{t.title}</Td>
                <Td className="tabular whitespace-nowrap text-fg-muted">{projects.find((x) => x.id === t.project_id)?.code ?? '—'}</Td>
                <Td>{p ? <PersonLabel person={p} size="xs" /> : '—'}</Td>
                <Td>
                  <Badge tone={t.priority === 'urgente' ? 'danger' : t.priority === 'haute' ? 'warning' : 'neutral'}>{PRIORITY[t.priority].label}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-fg-muted">{TASK_STATUS.find((s) => s.id === t.status)?.label}</Td>
                <Td numeric className={late ? 'font-medium text-danger' : undefined}>
                  {t.due_date ? formatDate(t.due_date) : '—'}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
