import { endOfISOWeek } from 'date-fns';
import { Link } from 'react-router-dom';
import { PRIORITY, TASK_STATUS, useProjects, useTasks } from '@/features/tasks/queries';
import { toIsoDate, todayIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { EmptyState, TableSkeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';

/** Tâches de la semaine : en cours, ou échéance avant dimanche (retards inclus). */
export function MyWeekTasks() {
  const tasks = useTasks();
  const projects = useProjects();
  const today = todayIso();
  const sunday = toIsoDate(endOfISOWeek(new Date()));
  const rows = (tasks.data ?? [])
    .filter((t) => t.status !== 'termine' && (t.status === 'en_cours' || (t.due_date !== null && t.due_date <= sunday)))
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));

  return (
    <Panel
      title="Mes tâches de la semaine"
      actions={
        <Link to="/taches" className="text-sm text-accent hover:underline">
          Ouvrir le tableau
        </Link>
      }
      flush
    >
      {!tasks.data ? (
        <TableSkeleton rows={4} columns={4} />
      ) : rows.length === 0 ? (
        <EmptyState title="Rien d’urgent cette semaine" description="Aucune tâche en cours ni d’échéance avant dimanche." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Tâche</Th>
              <Th>Affaire</Th>
              <Th>Priorité</Th>
              <Th>Statut</Th>
              <Th align="right">Échéance</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map((t) => {
              const project = projects.data?.find((p) => p.id === t.project_id);
              const late = t.due_date !== null && t.due_date < today;
              return (
                <Tr key={t.id}>
                  <Td className="font-medium">{t.title}</Td>
                  <Td className="whitespace-nowrap text-fg-muted">{project?.code ?? '—'}</Td>
                  <Td>
                    <Badge tone={t.priority === 'urgente' ? 'danger' : t.priority === 'haute' ? 'warning' : 'neutral'}>{PRIORITY[t.priority].label}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-fg-muted">{TASK_STATUS.find((s) => s.id === t.status)?.label}</Td>
                  <Td numeric className={late ? 'text-danger' : undefined}>
                    {t.due_date ? formatDate(t.due_date) : '—'}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}
