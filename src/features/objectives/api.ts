import { check, unwrap } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import type { Tables, TablesInsert, TablesUpdate } from '@/shared/types/database';

export type Objective = Tables<'objectives'>;
export type KeyResult = Tables<'key_results'>;
export type KrHistory = Tables<'key_result_history'>;

export const listObjectives = async (): Promise<Objective[]> =>
  unwrap(await supabase.from('objectives').select('*').order('due_date'), 'Objectifs');

export const listKeyResults = async (): Promise<KeyResult[]> =>
  unwrap(await supabase.from('key_results').select('*').order('position'), 'Résultats clés');

export const listHistory = async (): Promise<KrHistory[]> =>
  unwrap(await supabase.from('key_result_history').select('*').order('recorded_at'), 'Historique');

export interface ObjectiveInput {
  objective: TablesInsert<'objectives'>;
  keyResults: Omit<TablesInsert<'key_results'>, 'objective_id'>[];
}

export async function createObjective({ objective, keyResults }: ObjectiveInput): Promise<void> {
  const created = unwrap(await supabase.from('objectives').insert(objective).select('id').single(), 'Création objectif');
  if (keyResults.length) {
    check(
      await supabase.from('key_results').insert(keyResults.map((k, i) => ({ ...k, objective_id: created.id, position: i }))),
      'Résultats clés',
    );
  }
}

export async function updateObjective(id: string, patch: TablesUpdate<'objectives'>): Promise<void> {
  check(await supabase.from('objectives').update(patch).eq('id', id), 'Mise à jour objectif');
}

export async function proposeValue(keyResultId: string, value: number): Promise<void> {
  check(await supabase.rpc('propose_key_result_value', { p_key_result_id: keyResultId, p_value: value }), 'Avancement');
}

export async function reviewValue(keyResultId: string, accept: boolean): Promise<void> {
  check(await supabase.rpc('review_key_result_value', { p_key_result_id: keyResultId, p_accept: accept }), 'Validation');
}
