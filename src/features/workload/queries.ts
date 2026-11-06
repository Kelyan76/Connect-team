import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';

export const useAllocations = () => useTable(qk.workload, 'workload_allocations', 'week_start');

export const useSaveAllocation = () =>
  useWrite(
    async (a: { collaborator_id: string; project_id: string; week_start: string; percent: number }) =>
      a.percent === 0
        ? check(
            await supabase
              .from('workload_allocations')
              .delete()
              .eq('collaborator_id', a.collaborator_id)
              .eq('project_id', a.project_id)
              .eq('week_start', a.week_start),
            'Charge',
          )
        : check(await supabase.from('workload_allocations').upsert(a, { onConflict: 'collaborator_id,project_id,week_start' }), 'Charge'),
    [qk.workload],
    'Plan de charge mis à jour',
  );
