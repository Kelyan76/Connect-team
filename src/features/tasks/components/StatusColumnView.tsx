import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { formatDateShort, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { NativeSelect } from '@/shared/ui/input';
import type { Tables } from '@/shared/types/database';
import { PRIORITY, TASK_STATUS, useMoveTask, type Task, type TaskStatus } from '../queries';

interface Props {
  tasks: Task[];
  projects: Tables<'projects'>[];
  byId: Map<string, Person>;
  onOpen: (t: Task) => void;
}

/**
 * Planning sur téléphone : une seule colonne à la fois, choisie dans un menu déroulant.
 * Plus de défilement horizontal ; chaque tâche avance (ou recule) d'une étape en un toucher.
 */
export function StatusColumnView({ tasks, projects, byId, onOpen }: Props) {
  const [status, setStatus] = useState<TaskStatus>('a_faire');
  const move = useMoveTask();
  const today = todayIso();
  const index = TASK_STATUS.findIndex((s) => s.id === status);
  const prev = TASK_STATUS[index - 1];
  const next = TASK_STATUS[index + 1];
  const items = tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  const moveTo = (t: Task, to: TaskStatus) => {
    const last = Math.max(0, ...tasks.filter((x) => x.status === to).map((x) => x.position));
    move.mutate({ id: t.id, status: to, position: last + 1 });
  };

  return (
    <div className="flex flex-col gap-3">
      <NativeSelect aria-label="Colonne affichée" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
        {TASK_STATUS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label} ({tasks.filter((t) => t.status === s.id).length})
          </option>
        ))}
      </NativeSelect>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line-strong px-4 py-10 text-center text-sm text-fg-subtle">
          Aucune tâche « {TASK_STATUS[index].label} ».
        </p>
      ) : (
        <ul className="stagger flex flex-col gap-2">
          {items.map((t) => {
            const project = projects.find((p) => p.id === t.project_id);
            const who = t.assignee_id ? byId.get(t.assignee_id) : undefined;
            const late = t.status !== 'termine' && t.due_date !== null && t.due_date < today;
            return (
              <li key={t.id} className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
                <button type="button" onClick={() => onOpen(t)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                  <span className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-base font-medium leading-5">{t.title}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                      {project && <span className="tabular">{project.code}</span>}
                      {(t.priority === 'urgente' || t.priority === 'haute') && (
                        <Badge tone={t.priority === 'urgente' ? 'danger' : 'warning'}>{PRIORITY[t.priority].label}</Badge>
                      )}
                      {t.due_date && (
                        <span className={cn('tabular', late && 'font-medium text-danger')}>
                          {late ? 'En retard · ' : ''}
                          {formatDateShort(t.due_date)}
                        </span>
                      )}
                      {who && (
                        <span className="flex items-center gap-1">
                          <Avatar person={who} size="xs" />
                          {fullName(who)}
                        </span>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-fg-subtle" aria-hidden />
                </button>
                {(prev || next) && (
                  <div className="flex border-t border-line">
                    {prev && (
                      <Button variant="ghost" size="sm" className="h-10 flex-1 rounded-none" onClick={() => moveTo(t, prev.id)}>
                        <ArrowLeft aria-hidden />
                        {prev.label}
                      </Button>
                    )}
                    {prev && next && <span className="w-px bg-line" aria-hidden />}
                    {next && (
                      <Button variant="ghost" size="sm" className="h-10 flex-1 rounded-none font-semibold text-accent" onClick={() => moveTo(t, next.id)}>
                        {next.label}
                        <ArrowRight aria-hidden />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
