import { useQuery } from '@tanstack/react-query';
import { check, unwrap } from '@/shared/lib/errors';
import { useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables, TablesUpdate } from '@/shared/types/database';

export type TeamSettings = Tables<'team_settings'>;

export const useSettings = () =>
  useQuery({
    queryKey: qk.settings,
    queryFn: async (): Promise<TeamSettings> => unwrap(await supabase.from('team_settings').select('*').single(), 'Paramètres'),
  });

export const useSaveSettings = () =>
  useWrite(
    async ({ teamId, patch }: { teamId: string; patch: TablesUpdate<'team_settings'> }) =>
      check(await supabase.from('team_settings').update(patch).eq('team_id', teamId), 'Paramètres'),
    [qk.settings],
    'Seuils d’alerte enregistrés',
  );
