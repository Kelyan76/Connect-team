import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Dialog, SheetContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { PRIORITY, TASK_STATUS, useCreateTask, useDeleteTask, useMoveTask, useProjects, useUpdateTask, type Task, type TaskPriority } from '../queries';

const schema = z.object({
  title: z.string().trim().min(3, '3 caractères minimum.').max(200),
  description: z.string().max(4000),
  project_id: z.string(),
  assignee_id: z.string(),
  priority: z.enum(['basse', 'normale', 'haute', 'urgente']),
  status: z.enum(['a_faire', 'en_cours', 'en_validation', 'termine']),
  due_date: z.string(),
});
type Values = z.infer<typeof schema>;

/** Panneau latéral : création et modification (manager), consultation et statut (collaborateur). */
export function TaskDialog({ task, onClose }: { task: Task | 'new' | null; onClose: () => void }) {
  const { isManager } = useCurrentUser();
  const team = useTeamMembers();
  const projects = useProjects();
  const create = useCreateTask();
  const update = useUpdateTask();
  const move = useMoveTask();
  const remove = useDeleteTask();
  const [confirm, setConfirm] = useState(false);
  const existing = task && task !== 'new' ? task : null;
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!task) return;
    form.reset({
      title: existing?.title ?? '',
      description: existing?.description ?? '',
      project_id: existing?.project_id ?? '',
      assignee_id: existing?.assignee_id ?? '',
      priority: existing?.priority ?? 'normale',
      status: existing?.status ?? 'a_faire',
      due_date: existing?.due_date ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const onSubmit = form.handleSubmit(async (v) => {
    const payload = { ...v, project_id: v.project_id || null, assignee_id: v.assignee_id || null, due_date: v.due_date || null };
    if (!isManager && existing) await move.mutateAsync({ id: existing.id, status: v.status, position: existing.position });
    else if (existing) await update.mutateAsync({ id: existing.id, patch: payload });
    else await create.mutateAsync(payload);
    onClose();
  });
  const e = form.formState.errors;
  const ro = !isManager;

  return (
    <Dialog open={task !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={existing ? existing.title : 'Nouvelle tâche'}
        description={existing ? `Créée le ${formatDate(existing.created_at)}` : 'Assignez une personne, une priorité et une échéance.'}
        footer={
          <>
            {isManager && existing && (
              <Button variant="ghost" className="mr-auto text-danger" onClick={() => setConfirm(true)}>
                <Trash2 aria-hidden />
                Supprimer
              </Button>
            )}
            <Button onClick={onClose}>Annuler</Button>
            <Button type="submit" form="task-form" variant="primary">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="task-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="Intitulé" error={e.title?.message}>
            <Input readOnly={ro} {...form.register('title')} />
          </Field>
          <Field label="Description" optional>
            <Textarea rows={4} readOnly={ro} {...form.register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Statut">
              <NativeSelect {...form.register('status')}>
                {TASK_STATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Priorité">
              <NativeSelect disabled={ro} {...form.register('priority')}>
                {(Object.keys(PRIORITY) as TaskPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY[p].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Responsable">
              <NativeSelect disabled={ro} {...form.register('assignee_id')}>
                <option value="">Non assignée</option>
                {team.active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Échéance">
              <Input type="date" readOnly={ro} {...form.register('due_date')} />
            </Field>
          </div>
          <Field label="Projet de rattachement">
            <NativeSelect disabled={ro} {...form.register('project_id')}>
              <option value="">Aucun</option>
              {(projects.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name} ({p.client})
                </option>
              ))}
            </NativeSelect>
          </Field>
          {ro && <p className="text-xs text-fg-subtle">Vous pouvez modifier le statut de vos tâches. Les autres informations sont gérées par votre manager.</p>}
        </form>
      </SheetContent>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Supprimer cette tâche ?"
        description={`« ${existing?.title ?? ''} » sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        onConfirm={() => existing && remove.mutate(existing.id, { onSuccess: () => { setConfirm(false); onClose(); } })}
      />
    </Dialog>
  );
}
