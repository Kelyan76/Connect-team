import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Enums, Tables } from '@/shared/types/database';

export type Absence = Tables<'absences'>;
export type AbsenceKind = Enums<'absence_kind'>;

export const ABSENCE_KIND: Record<AbsenceKind, string> = {
  conges_payes: 'Congés payés',
  rtt: 'RTT',
  maladie: 'Arrêt maladie',
  formation: 'Formation',
  sans_solde: 'Congé sans solde',
};

export const REQUEST_STATUS = {
  en_attente: { label: 'En attente', tone: 'warning' },
  validee: { label: 'Validée', tone: 'success' },
  refusee: { label: 'Refusée', tone: 'danger' },
} as const;

export const useAbsences = () => useTable(qk.absences, 'absences', 'start_date');

export const useRequestAbsence = () =>
  useWrite(
    async (a: { collaborator_id: string; kind: AbsenceKind; start_date: string; end_date: string; comment: string }) =>
      check(await supabase.from('absences').insert(a), 'Demande de congés'),
    [qk.absences],
    'Demande envoyée à votre manager',
  );

export const useDecideAbsence = () =>
  useWrite(
    async ({ id, status, comment, by }: { id: string; status: 'validee' | 'refusee'; comment: string; by: string }) =>
      check(
        await supabase
          .from('absences')
          .update({ status, decision_comment: comment, decided_by: by, decided_at: new Date().toISOString() })
          .eq('id', id),
        'Décision',
      ),
    [qk.absences],
    (v) => (v.status === 'validee' ? 'Absence validée' : 'Demande refusée'),
  );

export const useCancelAbsence = () =>
  useWrite(async (id: string) => check(await supabase.from('absences').delete().eq('id', id), 'Annulation'), [qk.absences], 'Demande annulée');
