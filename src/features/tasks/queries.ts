import { useMutation, useQueryClient } from '@tanstack/react-query';
import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Enums, Tables, TablesInsert, TablesUpdate } from '@/shared/types/database';

export type Task = Tables<'tasks'>;
export type TaskStatus = Enums<'task_status'>;
export type TaskPriority = Enums<'task_priority'>;

export const TASK_STATUS: { id: TaskStatus; label: string }[] = [
  { id: 'a_faire', label: 'À faire' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'en_validation', label: 'En validation' },
  { id: 'termine', label: 'Terminé' },
];

export const PRIORITY: Record<TaskPriority, { label: string; rank: number }> = {
  urgente: { label: 'Urgente', rank: 0 },
  haute: { label: 'Haute', rank: 1 },
  normale: { label: 'Normale', rank: 2 },
  basse: { label: 'Basse', rank: 3 },
};

export const useProjects = () => useTable(qk.projects, 'projects', 'code');
export const useTasks = () => useTable(qk.tasks, 'tasks', 'position');

/** Déplacement (glisser-déposer) : optimiste, la carte change de colonne sans attendre le serveur. */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, position }: { id: string; status: TaskStatus; position: number }) =>
      check(await supabase.from('tasks').update({ status, position }).eq('id', id), 'Déplacement'),
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: qk.tasks });
      const previous = qc.getQueryData<Task[]>(qk.tasks);
      qc.setQueryData<Task[]>(qk.tasks, (list) => list?.map((t) => (t.id === id ? { ...t, status, position } : t)));
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.tasks, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

export const useCreateTask = () =>
  useWrite(async (t: TablesInsert<'tasks'>) => check(await supabase.from('tasks').insert(t), 'Tâche'), [qk.tasks], 'Tâche créée');

export const useUpdateTask = () =>
  useWrite(
    async ({ id, patch }: { id: string; patch: TablesUpdate<'tasks'> }) => check(await supabase.from('tasks').update(patch).eq('id', id), 'Tâche'),
    [qk.tasks],
    'Tâche mise à jour',
  );

export const useDeleteTask = () =>
  useWrite(async (id: string) => check(await supabase.from('tasks').delete().eq('id', id), 'Tâche'), [qk.tasks], 'Tâche supprimée');
