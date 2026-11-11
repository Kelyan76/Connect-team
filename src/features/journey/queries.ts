import { useMemo } from 'react';
import { useMissions } from '@/features/delegation/queries';
import { useFeedbacks } from '@/features/feedback/queries';
import { useObjectives } from '@/features/objectives/queries';
import { KIND_LABEL } from '@/features/reviews/lib/review-rules';
import { useReviewActions, useReviews } from '@/features/reviews/queries';
import { useSkillLevels, useSkills } from '@/features/skills/queries';
import { buildJourney, type JourneyEvent } from './lib/journey';

/** Parcours d'une personne : ses réussites, à partir des données qu'elle (ou son manager) peut voir. */
export function useJourney(personId: string): { events: JourneyEvent[] | undefined; inProgress: { id: string; title: string; progress: number }[] } {
  const feedbacks = useFeedbacks();
  const objectives = useObjectives();
  const missions = useMissions();
  const skills = useSkills();
  const levels = useSkillLevels();
  const actions = useReviewActions();
  const reviews = useReviews();

  return useMemo(() => {
    if (!feedbacks.data || !objectives.data || !missions.data || !skills.data || !levels.data || !actions.data || !reviews.data) {
      return { events: undefined, inProgress: [] };
    }
    const names = new Map(skills.data.map((s) => [s.id, s.name]));
    const mine = objectives.data.filter((o) => o.owner_id === personId);
    const events = buildJourney({
      feedbacks: feedbacks.data.filter((f) => f.collaborator_id === personId),
      objectives: mine,
      missions: missions.data.filter((m) => m.collaborator_id === personId),
      skills: levels.data
        .filter((l) => l.collaborator_id === personId && l.manager_level !== null)
        .map((l) => ({ skill: names.get(l.skill_id) ?? 'Compétence', level: l.manager_level ?? 0, validated_at: l.validated_at })),
      actions: actions.data.filter((a) => a.owner_id === personId),
      reviews: reviews.data
        .filter((r) => r.collaborator_id === personId)
        .map((r) => ({ ...r, label: KIND_LABEL[r.kind] })),
    });
    const inProgress = mine.filter((o) => o.progress < 1).map((o) => ({ id: o.id, title: o.title, progress: o.progress }));
    return { events, inProgress };
  }, [feedbacks.data, objectives.data, missions.data, skills.data, levels.data, actions.data, reviews.data, personId]);
}
