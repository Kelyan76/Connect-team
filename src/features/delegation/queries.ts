import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { BadgeTone } from '@/shared/ui/badge';
import type { Enums } from '@/shared/types/database';

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
