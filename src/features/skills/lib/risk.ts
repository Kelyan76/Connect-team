export interface SkillLevelLike {
  collaborator_id: string;
  skill_id: string;
  self_level: number | null;
  manager_level: number | null;
  validated_at: string | null;
}

export const LEVEL_LABEL: Record<number, string> = {
  1: 'Notions',
  2: 'Pratique encadrée',
  3: 'Autonome',
  4: 'Expert, peut former',
};

/** Niveau retenu : celui validé par le manager, à défaut l'auto-évaluation. */
export const effectiveLevel = (l: SkillLevelLike | undefined) => l?.manager_level ?? l?.self_level ?? 0;

export const isPendingValidation = (l: SkillLevelLike | undefined) =>
  !!l && l.self_level !== null && l.validated_at === null;

/** Compétences maîtrisées (niveau ≥ 3) par une seule personne : risque de dépendance. */
export function singleHolderSkills(levels: SkillLevelLike[]): Map<string, string> {
  const holders = new Map<string, string[]>();
  for (const l of levels) {
    if ((l.manager_level ?? 0) >= 3) holders.set(l.skill_id, [...(holders.get(l.skill_id) ?? []), l.collaborator_id]);
  }
  const out = new Map<string, string>();
  for (const [skill, people] of holders) if (people.length === 1) out.set(skill, people[0]);
  return out;
}

export interface TrainingSuggestion {
  skill_id: string;
  collaborator_id: string;
  from: number;
  reason: string;
}

/**
 * Suggestions de formation : pour chaque compétence à risque, la personne la plus proche
 * du niveau autonome (hors détenteur) est proposée pour un binôme avec l'expert.
 */
export function trainingSuggestions(levels: SkillLevelLike[], people: string[]): TrainingSuggestion[] {
  const risky = singleHolderSkills(levels);
  const out: TrainingSuggestion[] = [];
  for (const [skill, holder] of risky) {
    const candidates = people
      .filter((p) => p !== holder)
      .map((p) => ({ p, level: levels.find((l) => l.skill_id === skill && l.collaborator_id === p)?.manager_level ?? 0 }))
      .sort((a, b) => b.level - a.level);
    const best = candidates[0];
    if (best) out.push({ skill_id: skill, collaborator_id: best.p, from: best.level, reason: 'binome' });
  }
  return out;
}
