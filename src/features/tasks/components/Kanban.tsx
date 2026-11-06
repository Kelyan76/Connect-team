import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { formatDateShort } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import type { Tables } from '@/shared/types/database';
import { PRIORITY, TASK_STATUS, useMoveTask, type Task, type TaskStatus } from '../queries';

interface CardProps {
  task: Task;
  project?: Tables<'projects'>;
  assignee?: Person;
  onOpen?: () => void;
  overlay?: boolean;
}

function TaskCard({ task, project, assignee, onOpen, overlay }: CardProps) {
  const late = task.status !== 'termine' && task.due_date !== null && task.due_date < todayIso();
  return (
    <div className={cn('flex flex-col gap-2 rounded border border-line bg-surface px-3 py-2 text-left', overlay ? 'shadow-md' : 'hover:border-line-strong')}>
      <button type="button" onClick={onOpen} className="text-left text-base font-medium leading-5 hover:underline">
        {task.title}
      </button>
      <div className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
        {project && <span className="tabular">{project.code}</span>}
        {(task.priority === 'urgente' || task.priority === 'haute') && (
          <Badge tone={task.priority === 'urgente' ? 'danger' : 'warning'}>{PRIORITY[task.priority].label}</Badge>
        )}
        <span className="ml-auto flex items-center gap-2">
          {task.due_date && <span className={cn('tabular', late && 'font-medium text-danger')}>{formatDateShort(task.due_date)}</span>}
          {assignee && <Avatar person={assignee} size="xs" />}
        </span>
      </div>
    </div>
  );
}

function Draggable(props: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn('cursor-grab touch-none', isDragging && 'opacity-40')} aria-roledescription="carte déplaçable">
      <TaskCard {...props} />
    </div>
  );
}

function Column({ id, label, count, children }: { id: TaskStatus; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label}, ${count} tâches`}
      className={cn('flex min-h-80 min-w-64 flex-col rounded-lg border bg-canvas', isOver ? 'border-accent bg-accent-subtle/60' : 'border-line')}
    >
      <h2 className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm font-semibold">
        {label}
        <span className="tabular text-xs font-medium text-fg-subtle">{count}</span>
      </h2>
      <div className="flex flex-1 flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

/** Kanban à quatre colonnes ; déplacement à la souris, au doigt ou au clavier (Espace puis flèches). */
export function Kanban({ tasks, projects, byId, onOpen }: { tasks: Task[]; projects: Tables<'projects'>[]; byId: Map<string, Person>; onOpen: (t: Task) => void }) {
  const move = useMoveTask();
  const [active, setActive] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const projectOf = (t: Task) => projects.find((p) => p.id === t.project_id);

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const task = tasks.find((t) => t.id === e.active.id);
    const status = e.over?.id as TaskStatus | undefined;
    if (!task || !status || task.status === status) return;
    const last = Math.max(0, ...tasks.filter((t) => t.status === status).map((t) => t.position));
    move.mutate({ id: task.id, status, position: last + 1 });
  };

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActive(tasks.find((t) => t.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="grid grid-flow-col gap-3 overflow-x-auto pb-2 [grid-auto-columns:minmax(256px,1fr)]">
        {TASK_STATUS.map((col) => {
          const items = tasks.filter((t) => t.status === col.id).sort((a, b) => a.position - b.position);
          return (
            <Column key={col.id} id={col.id} label={col.label} count={items.length}>
              {items.map((t) => (
                <Draggable key={t.id} task={t} project={projectOf(t)} assignee={t.assignee_id ? byId.get(t.assignee_id) : undefined} onOpen={() => onOpen(t)} />
              ))}
              {items.length === 0 && <p className="px-1 py-4 text-center text-xs text-fg-subtle">Déposez une carte ici</p>}
            </Column>
          );
        })}
      </div>
      <DragOverlay>{active ? <TaskCard task={active} project={projectOf(active)} assignee={active.assignee_id ? byId.get(active.assignee_id) : undefined} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
