import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { check, unwrap } from '@/shared/lib/errors';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';
import { toast } from '@/shared/ui/toaster';

/** Équipes au sein de l'équipe du manager (ex. Back-end, Mobile, Qualité). */
export type Squad = Tables<'squads'>;

export const listSquads = async (): Promise<Squad[]> =>
  unwrap(await supabase.from('squads').select('*').order('name'), 'Équipes');

export const useSquads = () => useQuery({ queryKey: qk.squads, queryFn: listSquads });

export function useCreateSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      check(await supabase.from('squads').insert({ name: name.trim() }), 'Équipe'),
    onSuccess: (_d, name) => {
      toast.success(`Équipe « ${name.trim()} » créée`);
      return qc.invalidateQueries({ queryKey: qk.squads });
    },
  });
}

export function useDeleteSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      check(await supabase.from('squads').delete().eq('id', id), 'Équipe'),
    onSuccess: () => {
      toast.success('Équipe supprimée : ses membres restent dans votre équipe');
      return Promise.all([
        qc.invalidateQueries({ queryKey: qk.squads }),
        qc.invalidateQueries({ queryKey: qk.people }),
        qc.invalidateQueries({ queryKey: qk.objectives }),
      ]);
    },
  });
}

/** Attribue (ou retire) l'équipe d'un collaborateur. */
export const assignSquad = async (personId: string, squadId: string | null) =>
  check(await supabase.from('profiles').update({ squad_id: squadId }).eq('id', personId), 'Équipe');

export function useAssignSquad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, squadId }: { personId: string; squadId: string | null }) =>
      assignSquad(personId, squadId),
    onSuccess: () => {
      toast.success('Équipe mise à jour');
      return qc.invalidateQueries({ queryKey: qk.people });
    },
  });
}
