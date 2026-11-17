/**
 * Parcours de bienvenue : ce qu'il reste à remplir dans son profil.
 * - Collaborateur : style DISC, puis auto-évaluation des compétences de l'équipe.
 * - Manager : son propre style DISC.
 * Les notifications sont proposées en dernière étape, sans être exigées.
 */
export type OnboardingStep = 'bienvenue' | 'disc' | 'competences' | 'notifications';

export interface OnboardingInput {
  role: 'manager' | 'collaborateur';
  hasDisc: boolean;
  /** Nombre de compétences de l'équipe. */
  skills: number;
  /** Compétences auto-évaluées par la personne. */
  selfAssessed: number;
}

/** Au moins 3 compétences (ou toutes s'il y en a moins) : assez pour un premier échange. */
export const minSelfAssessed = (skills: number) => Math.min(3, skills);

export function missingSteps(i: OnboardingInput): OnboardingStep[] {
  const out: OnboardingStep[] = [];
  if (!i.hasDisc) out.push('disc');
  if (i.role === 'collaborateur' && i.skills > 0 && i.selfAssessed < minSelfAssessed(i.skills))
    out.push('competences');
  return out;
}

export const isProfileComplete = (i: OnboardingInput) => missingSteps(i).length === 0;

/** Étapes affichées : bienvenue, ce qui manque, puis notifications. */
export function stepsToShow(i: OnboardingInput): OnboardingStep[] {
  return ['bienvenue', ...missingSteps(i), 'notifications'];
}

/** Clé « déjà proposé pour cette connexion » : on redemande à la connexion suivante tant que ce n'est pas fait. */
export const proposedKey = (userId: string, signedInAt: string | null | undefined) =>
  `connect-team:bienvenue:${userId}:${signedInAt ?? 'session'}`;
