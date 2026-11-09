/**
 * « Préparer mon 1 à 1 » en 2 minutes, côté collaborateur : « c'est son 1 à 1 : laissez-le parler ! »
 * Les réponses sont des réponses d'entretien ordinaires (auteur : collaborateur), avec des clés dédiées :
 * le manager ne les lit qu'une fois la préparation envoyée, comme le reste de la préparation.
 */

export const QUICK_KEYS = { topics: 'mes_sujets', good: 'ca_va', stuck: 'ca_coince' } as const;

export const TOPICS = ['Ma charge', 'Mes projets', 'L’ambiance dans l’équipe', 'Une difficulté', 'Une idée', 'Mon évolution', 'Un besoin de formation', 'Ma vie perso'] as const;

const SEP = ' · ';

export const topicsToValue = (topics: string[]) => topics.join(SEP);

export function valueToTopics(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(SEP).map((t) => t.trim()).filter(Boolean);
}

/** Préparation rapide commencée (au moins un sujet ou un mot) ? */
export function hasQuickPrep(answers: { question_key: string; author: string; value: unknown }[]): boolean {
  return answers.some(
    (a) => a.author === 'collaborateur' && Object.values(QUICK_KEYS).includes(a.question_key as never) && typeof a.value === 'string' && a.value.trim() !== '',
  );
}
