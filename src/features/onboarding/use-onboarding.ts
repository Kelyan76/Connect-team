import { useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useSkillLevels, useSkills } from '@/features/skills/queries';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { isProfileComplete, type OnboardingInput } from './lib/onboarding';

/** État du profil de la personne connectée : ce qui reste à remplir (DISC, compétences). */
export function useOnboardingStatus(): {
  ready: boolean;
  input: OnboardingInput;
  complete: boolean;
} {
  const { profile, isManager } = useCurrentUser();
  const discs = useDiscProfiles();
  const skills = useSkills();
  const levels = useSkillLevels();

  return useMemo(() => {
    const input: OnboardingInput = {
      role: isManager ? 'manager' : 'collaborateur',
      hasDisc: !!discs.data?.some((d) => d.collaborator_id === profile.id),
      skills: skills.data?.length ?? 0,
      selfAssessed: (levels.data ?? []).filter(
        (l) => l.collaborator_id === profile.id && l.self_level,
      ).length,
    };
    const ready = !!discs.data && (isManager || (!!skills.data && !!levels.data));
    return { ready, input, complete: isProfileComplete(input) };
  }, [discs.data, skills.data, levels.data, profile.id, isManager]);
}
