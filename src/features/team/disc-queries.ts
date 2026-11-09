import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';
import type { DiscStyle } from './lib/disc';

export type DiscProfile = Tables<'disc_profiles'>;

export const useDiscProfiles = () => useTable(qk.discProfiles, 'disc_profiles', 'collaborator_id');

export const useSaveDisc = () =>
  useWrite(
    async (d: { collaborator_id: string; primary_style: DiscStyle; secondary_style: DiscStyle | null; source: 'auto_evaluation' | 'echange'; note: string }) =>
      check(await supabase.from('disc_profiles').upsert(d, { onConflict: 'collaborator_id' }), 'Profil DISC'),
    [qk.discProfiles],
    'Profil DISC enregistré',
  );
