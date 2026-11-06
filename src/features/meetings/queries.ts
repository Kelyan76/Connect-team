import { check, unwrap } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Enums, TablesInsert, TablesUpdate } from '@/shared/types/database';

export type ActionStatus = Enums<'action_status'>;
export const ACTION_STATUS: Record<ActionStatus, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' };

export const useMeetings = (enabled = true) => useTable(qk.meetings, 'meetings', 'held_on', false, enabled);
export const useDecisions = (enabled = true) => useTable(qk.decisions, 'decisions', 'created_at', true, enabled);
export const useMeetingActions = () => useTable(qk.meetingActions, 'meeting_actions', 'due_date');

export const useCreateMeeting = () =>
  useWrite(
    async (m: TablesInsert<'meetings'>) => unwrap(await supabase.from('meetings').insert(m).select('id').single(), 'Réunion').id,
    [qk.meetings],
    'Compte-rendu créé',
  );

export const useUpdateMeeting = () =>
  useWrite(
    async ({ id, patch }: { id: string; patch: TablesUpdate<'meetings'> }) => check(await supabase.from('meetings').update(patch).eq('id', id), 'Réunion'),
    [qk.meetings],
    'Compte-rendu enregistré',
  );

export const useAddDecision = () =>
  useWrite(async (d: TablesInsert<'decisions'>) => check(await supabase.from('decisions').insert(d), 'Décision'), [qk.decisions], 'Décision ajoutée');

export const useAddMeetingAction = () =>
  useWrite(
    async (a: TablesInsert<'meeting_actions'>) => check(await supabase.from('meeting_actions').insert(a), 'Action'),
    [qk.meetingActions],
    'Action ajoutée',
  );

export const useSetMeetingActionStatus = () =>
  useWrite(
    async ({ id, status }: { id: string; status: ActionStatus }) =>
      check(
        await supabase
          .from('meeting_actions')
          .update({ status, done_at: status === 'fait' ? new Date().toISOString() : null })
          .eq('id', id),
        'Action',
      ),
    [qk.meetingActions],
  );
