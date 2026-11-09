import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { BadgeTone } from '@/shared/ui/badge';
import type { Enums, Tables } from '@/shared/types/database';

export type DelegationLevel = Enums<'delegation_level'>;

export const DELEGATION: Record<DelegationLevel, { label: string; short: string; tone: BadgeTone; help: string }> = {
  decide: { label: 'Décide seul', short: 'Décide', tone: 'success', help: 'Agit et informe ensuite si nécessaire.' },
  propose: { label: 'Propose puis valide', short: 'Propose', tone: 'accent', help: 'Prépare la décision, le manager tranche.' },
  execute: { label: 'Exécute', short: 'Exécute', tone: 'neutral', help: 'Applique la décision prise par le manager.' },
};

export const useDomains = () => useTable(qk.domains, 'delegation_domains', 'position');
export const useDelegations = () => useTable(qk.delegations, 'delegations', 'domain_id');

export const useSetDelegation = () =>
  useWrite(
    async (d: { collaborator_id: string; domain_id: string; level: DelegationLevel }) =>
      check(await supabase.from('delegations').upsert(d, { onConflict: 'collaborator_id,domain_id' }), 'Délégation'),
    [qk.delegations],
    'Délégation mise à jour',
  );

export const useAddDomain = () =>
  useWrite(
    async (d: { name: string; description: string; position: number }) => check(await supabase.from('delegation_domains').insert(d), 'Domaine'),
    [qk.domains],
    'Type de décision ajouté',
  );

// ─── Missions confiées (processus de délégation du cours) ───────────────

export type Mission = Tables<'delegation_missions'>;
export type MissionInput = Pick<
  Mission,
  'collaborator_id' | 'title' | 'expected_result' | 'limits' | 'support' | 'checkpoints' | 'due_date' | 'autonomy'
>;

/** Note d'autonomie (kit 1 à 1) : du plus guidé au plus autonome. */
export const AUTONOMY: Record<number, { label: string; help: string }> = {
  1: { label: 'Guidé', help: 'Je montre, il observe puis reproduit avec moi.' },
  2: { label: 'Accompagné', help: 'Il fait, je vérifie chaque étape.' },
  3: { label: 'Soutenu', help: 'Il fait, points de contrôle réguliers.' },
  4: { label: 'Autonome', help: 'Il décide, je suis informé aux jalons.' },
  5: { label: 'Délégué', help: 'Il porte le sujet de bout en bout.' },
};

export const useMissions = () => useTable(qk.missions, 'delegation_missions', 'created_at', false);

export const useSaveMission = () =>
  useWrite(
    async ({ id, ...m }: MissionInput & { id?: string }) =>
      check(id ? await supabase.from('delegation_missions').update(m).eq('id', id) : await supabase.from('delegation_missions').insert(m), 'Mission'),
    [qk.missions],
    (m) => (m.id ? 'Mission mise à jour' : 'Mission confiée'),
  );

export const useCloseMission = () =>
  useWrite(
    async ({ id, debrief }: { id: string; debrief: string }) =>
      check(await supabase.from('delegation_missions').update({ status: 'terminee', debrief }).eq('id', id), 'Mission'),
    [qk.missions],
    'Bilan enregistré : pensez à déléguer à nouveau',
  );
