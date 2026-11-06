import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from '@/shared/ui/toaster';
import type { Database, Tables } from '@/shared/types/database';
import { unwrap } from './errors';
import { supabase } from './supabase';

type TableName = keyof Database['public']['Tables'];

/** Lecture complète d'une table (filtrée par la RLS), triée. */
export async function listTable<T extends TableName>(table: T, order: string, ascending = true): Promise<Tables<T>[]> {
  const result = await supabase.from(table).select('*').order(order, { ascending });
  return unwrap(result, table) as unknown as Tables<T>[];
}

export function useTable<T extends TableName>(key: QueryKey, table: T, order: string, ascending = true, enabled = true) {
  return useQuery({ queryKey: key, queryFn: () => listTable(table, order, ascending), enabled });
}

/** Mutation standard : toast de succès puis invalidation des clés concernées. */
export function useWrite<V>(fn: (vars: V) => Promise<unknown>, keys: QueryKey[], success?: string | ((vars: V) => string)) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, vars) => {
      const message = typeof success === 'function' ? success(vars) : success;
      if (message) toast.success(message);
      return Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
  });
}
