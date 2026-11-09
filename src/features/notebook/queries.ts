import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';

/** Carnet d'observations : faits notés au fil de la semaine, privés au manager (kit 1 à 1, étape 1 de la préparation). */
export type Observation = Tables<'observations'>;
export type ObservationTone = 'positif' | 'a_ajuster' | 'neutre';

export const OBS_TONE: Record<ObservationTone, { label: string; dot: string }> = {
  positif: { label: 'À reconnaître', dot: 'bg-success' },
  a_ajuster: { label: 'À ajuster', dot: 'bg-warning' },
  neutre: { label: 'À suivre', dot: 'bg-fg-subtle' },
};

export const useObservations = (enabled = true) => useTable(qk.observations, 'observations', 'observed_on', false, enabled);

export const useAddObservation = () =>
  useWrite(
    async (o: { collaborator_id: string; tone: ObservationTone; body: string; observed_on: string }) =>
      check(await supabase.from('observations').insert(o), 'Observation'),
    [qk.observations],
    'Observation notée',
  );

export const useDeleteObservation = () =>
  useWrite(async (id: string) => check(await supabase.from('observations').delete().eq('id', id), 'Observation'), [qk.observations], 'Observation supprimée');
