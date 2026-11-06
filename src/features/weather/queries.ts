import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';

export const useWeather = () => useTable(qk.weather, 'weather_entries', 'week_start');

export const useSaveWeather = () =>
  useWrite(
    async (e: { collaborator_id: string; week_start: string; mood: number; workload: number; comment: string }) =>
      check(await supabase.from('weather_entries').upsert(e, { onConflict: 'collaborator_id,week_start' }), 'Météo'),
    [qk.weather],
    'Météo de la semaine enregistrée',
  );
