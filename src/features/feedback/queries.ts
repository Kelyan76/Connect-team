import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Enums } from '@/shared/types/database';

export type FeedbackKind = Enums<'feedback_kind'>;

/** Les trois feedbacks du cours ; « point fort » et « axe de progrès » restent lisibles pour l'historique. */
export const FEEDBACK_KIND: Record<FeedbackKind, string> = {
  reconnaissance: 'Reconnaissance',
  amelioration: 'Amélioration',
  recadrage: 'Recadrage',
  point_fort: 'Reconnaissance',
  axe_progres: 'Amélioration',
};

export const useFeedbacks = () => useTable(qk.feedbacks, 'feedbacks', 'created_at', false);

export const useCreateFeedback = () =>
  useWrite(
    async (f: { collaborator_id: string; kind: FeedbackKind; body: string; is_shared: boolean; desc_d: string; desc_e: string; desc_s: string; desc_c: string }) =>
      check(await supabase.from('feedbacks').insert(f), 'Feedback'),
    [qk.feedbacks],
    (f) => (f.is_shared ? 'Feedback partagé avec le collaborateur' : 'Feedback enregistré (privé)'),
  );

export const useToggleShare = () =>
  useWrite(
    async ({ id, shared }: { id: string; shared: boolean }) => check(await supabase.from('feedbacks').update({ is_shared: shared }).eq('id', id), 'Partage'),
    [qk.feedbacks],
    (v) => (v.shared ? 'Feedback partagé' : 'Feedback rendu privé'),
  );

export const useDeleteFeedback = () =>
  useWrite(async (id: string) => check(await supabase.from('feedbacks').delete().eq('id', id), 'Feedback'), [qk.feedbacks], 'Feedback supprimé');
