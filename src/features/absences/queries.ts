import { useQuery } from '@tanstack/react-query';
import { notifyAbsence } from '@/features/notifications/push';
import { check, unwrap } from '@/shared/lib/errors';
import { listTable, useWrite } from '@/shared/lib/crud';
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

/** Relu toutes les 30 s : le manager voit arriver les demandes, le collaborateur les décisions. */
export const useAbsences = () =>
  useQuery({
    queryKey: qk.absences,
    queryFn: () => listTable('absences', 'start_date'),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

export const useRequestAbsence = () =>
  useWrite(
    async (a: {
      collaborator_id: string;
      kind: AbsenceKind;
      start_date: string;
      end_date: string;
      comment: string;
    }) => {
      const created = unwrap(
        await supabase.from('absences').insert(a).select('id').single(),
        'Demande de congés',
      );
      // Notification sur le téléphone du manager (sans bloquer si l'envoi échoue).
      notifyAbsence('absence_request', created.id);
    },
    [qk.absences],
    'Demande envoyée à votre manager',
  );

export const useDecideAbsence = () =>
  useWrite(
    async ({
      id,
      status,
      comment,
      by,
    }: {
      id: string;
      status: 'validee' | 'refusee';
      comment: string;
      by: string;
    }) => {
      check(
        await supabase
          .from('absences')
          .update({
            status,
            decision_comment: comment,
            decided_by: by,
            decided_at: new Date().toISOString(),
          })
          .eq('id', id),
        'Décision',
      );
      // Notification sur le téléphone du collaborateur.
      notifyAbsence('absence_decision', id);
    },
    [qk.absences],
    (v) =>
      v.status === 'validee'
        ? 'Congé accepté : le collaborateur est prévenu'
        : 'Demande refusée : le collaborateur est prévenu',
  );

export const useCancelAbsence = () =>
  useWrite(
    async (id: string) =>
      check(await supabase.from('absences').delete().eq('id', id), 'Annulation'),
    [qk.absences],
    'Demande annulée',
  );
