import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';
import type { Diagnosis, NextStep, Scarf } from './lib/posture';

export type PostureNote = Tables<'posture_notes'>;

export const usePostureNotes = () => useTable(qk.postureNotes, 'posture_notes', 'created_at', false);

export const useSavePosture = () =>
  useWrite(
    async (p: { collaborator_id: string; situation: string; diagnosis: Diagnosis; scarf: Scarf; decision: string; next_step: NextStep }) =>
      check(await supabase.from('posture_notes').insert(p), 'Décision'),
    [qk.postureNotes],
    'Décision enregistrée dans votre journal',
  );
