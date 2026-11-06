import { check } from '@/shared/lib/errors';
import { useTable, useWrite } from '@/shared/lib/crud';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';

export const useSkills = () => useTable(qk.skills, 'skills', 'category');
export const useSkillLevels = () => useTable(qk.skillLevels, 'skill_levels', 'skill_id');

/** Auto-évaluation du collaborateur (RPC : seul self_level est modifiable). */
export const useSelfAssess = () =>
  useWrite(
    async ({ skillId, level }: { skillId: string; level: number }) =>
      check(await supabase.rpc('set_self_skill_level', { p_skill_id: skillId, p_level: level }), 'Auto-évaluation'),
    [qk.skillLevels],
    'Auto-évaluation enregistrée, en attente de validation',
  );

/** Validation par le manager : fixe le niveau retenu. */
export const useValidateLevel = () =>
  useWrite(
    async ({ collaboratorId, skillId, level }: { collaboratorId: string; skillId: string; level: number | null }) =>
      check(
        await supabase
          .from('skill_levels')
          .upsert(
            { collaborator_id: collaboratorId, skill_id: skillId, manager_level: level, validated_at: new Date().toISOString() },
            { onConflict: 'collaborator_id,skill_id' },
          ),
        'Validation',
      ),
    [qk.skillLevels],
    'Niveau validé',
  );

export const useAddSkill = () =>
  useWrite(
    async ({ name, category }: { name: string; category: string }) => check(await supabase.from('skills').insert({ name, category }), 'Compétence'),
    [qk.skills],
    'Compétence ajoutée',
  );

export const useDeleteSkill = () =>
  useWrite(async (id: string) => check(await supabase.from('skills').delete().eq('id', id), 'Compétence'), [qk.skills, qk.skillLevels], 'Compétence supprimée');
