import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { todayIso } from '@/shared/lib/dates';
import { qk } from '@/shared/lib/query-keys';
import { toast } from '@/shared/ui/toaster';
import * as api from './api';
import { objectiveProgress, objectiveStatus, type ObjectiveStatus } from './lib/status';

export interface ObjectiveView extends api.Objective {
  keyResults: api.KeyResult[];
  progress: number;
  status: ObjectiveStatus;
  pending: number;
}

/** Objectifs visibles avec leurs résultats clés, avancement et statut calculés. */
export function useObjectives() {
  const objectives = useQuery({ queryKey: qk.objectives, queryFn: api.listObjectives });
  const krs = useQuery({ queryKey: qk.keyResults, queryFn: api.listKeyResults });
  const data = useMemo<ObjectiveView[] | undefined>(() => {
    if (!objectives.data || !krs.data) return undefined;
    const today = todayIso();
    return objectives.data
      .filter((o) => !o.archived)
      .map((o) => {
        const keyResults = krs.data.filter((k) => k.objective_id === o.id);
        const progress = objectiveProgress(keyResults);
        return {
          ...o,
          keyResults,
          progress,
          status: objectiveStatus(o, progress, today),
          pending: keyResults.filter((k) => k.pending_value !== null).length,
        };
      });
  }, [objectives.data, krs.data]);
  return {
    data,
    isLoading: objectives.isLoading || krs.isLoading,
    error: objectives.error ?? krs.error,
    refetch: () => Promise.all([objectives.refetch(), krs.refetch()]),
  };
}

export const useKrHistory = () => useQuery({ queryKey: qk.krHistory, queryFn: api.listHistory });

function useInvalidateObjectives() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: qk.objectives }),
      qc.invalidateQueries({ queryKey: qk.keyResults }),
      qc.invalidateQueries({ queryKey: qk.krHistory }),
    ]);
}

export function useCreateObjective() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: api.createObjective,
    onSuccess: () => {
      toast.success('Objectif créé');
      return invalidate();
    },
  });
}

export function useArchiveObjective() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: (id: string) => api.updateObjective(id, { archived: true }),
    onSuccess: () => {
      toast.success('Objectif archivé');
      return invalidate();
    },
  });
}

/** Mise à jour optimiste : la nouvelle valeur s'affiche immédiatement. */
export function useProposeValue(asManager: boolean) {
  const qc = useQueryClient();
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => api.proposeValue(id, value),
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: qk.keyResults });
      const previous = qc.getQueryData<api.KeyResult[]>(qk.keyResults);
      qc.setQueryData<api.KeyResult[]>(qk.keyResults, (list) =>
        list?.map((k) => (k.id !== id ? k : asManager ? { ...k, current_value: value, pending_value: null } : { ...k, pending_value: value })),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => qc.setQueryData(qk.keyResults, ctx?.previous),
    onSuccess: () => toast.success(asManager ? 'Avancement mis à jour' : 'Avancement transmis pour validation'),
    onSettled: invalidate,
  });
}

export function useReviewValue() {
  const invalidate = useInvalidateObjectives();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => api.reviewValue(id, accept),
    onSuccess: (_d, v) => {
      toast.success(v.accept ? 'Avancement validé' : 'Proposition refusée');
      return invalidate();
    },
  });
}
