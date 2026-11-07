import { useQuery } from '@tanstack/react-query';
import { useWrite } from '@/shared/lib/crud';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { check, unwrap } from '@/shared/lib/errors';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Pulse } from './lib/pulse';

/** Lecture des pouls des 6 derniers mois (les siens pour un collaborateur, ceux de l'équipe pour le manager — RLS). */
export async function listPulses(): Promise<Pulse[]> {
  return unwrap(
    await supabase.from('daily_pulses').select('*').gte('day', isoAddDays(todayIso(), -190)).order('day', { ascending: false }).limit(5000),
    'Pouls du jour',
  );
}

export function usePulses() {
  return useQuery({ queryKey: qk.pulses, queryFn: listPulses });
}

export const useSavePulse = () =>
  useWrite(
    async (v: { collaboratorId: string; mood: number; energy: number; workload: number; note: string }) =>
      check(
        await supabase
          .from('daily_pulses')
          // Le jour est fixé par la base (heure de Paris) : pas d'écart possible avec l'horloge du téléphone.
          .upsert(
            { collaborator_id: v.collaboratorId, mood: v.mood, energy: v.energy, workload: v.workload, note: v.note },
            { onConflict: 'collaborator_id,day' },
          ),
        'Pouls du jour',
      ),
    [qk.pulses],
  );
