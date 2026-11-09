import { useMemo } from 'react';
import { useDelegations, useMissions } from '@/features/delegation/queries';
import { useFeedbacks } from '@/features/feedback/queries';
import { useObjectives } from '@/features/objectives/queries';
import { usePulses } from '@/features/pulse/queries';
import { useReviews } from '@/features/reviews/queries';
import { useSkillLevels } from '@/features/skills/queries';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { dreamLevers, type LeverState } from './lib/dream';

/** États des leviers DREAM de chaque collaborateur actif, calculés à partir des données de l'équipe. */
export function useDreamStates(): { data: Map<string, LeverState[]> | undefined; isLoading: boolean } {
  const team = useTeamMembers();
  const objectives = useObjectives();
  const reviews = useReviews();
  const feedbacks = useFeedbacks();
  const pulses = usePulses();
  const missions = useMissions();
  const delegations = useDelegations();
  const levels = useSkillLevels();

  const data = useMemo(() => {
    if (!team.data || !objectives.data || !reviews.data || !feedbacks.data || !pulses.data || !missions.data || !delegations.data || !levels.data) return undefined;
    const today = todayIso();
    const out = new Map<string, LeverState[]>();
    for (const p of team.active) {
      const last = reviews.data
        .filter((r) => r.collaborator_id === p.id && r.kind === 'one_to_one' && r.status === 'termine')
        .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
      // Humeur des 14 derniers jours (pas des 10 dernières réponses : un silence ne doit pas lisser la baisse).
      const since = isoAddDays(today, -14);
      const moods = pulses.data.filter((x) => x.collaborator_id === p.id && x.day >= since).map((x) => x.mood);
      const skillDates = levels.data
        .filter((l) => l.collaborator_id === p.id)
        .map((l) => l.validated_at ?? l.updated_at)
        .filter((d): d is string => !!d)
        .sort();
      out.set(
        p.id,
        dreamLevers({
          today,
          objectives: objectives.data.filter((o) => o.owner_id === p.id),
          lastOneToOne: last ? { date: last.scheduled_at, priority: last.priority } : null,
          feedbacks: feedbacks.data.filter((f) => f.collaborator_id === p.id),
          recentMoods: moods,
          activeMissions: missions.data.filter((m) => m.collaborator_id === p.id && m.status === 'en_cours'),
          decideDomains: delegations.data.filter((d) => d.collaborator_id === p.id && d.level === 'decide').length,
          lastSkillUpdate: skillDates.pop() ?? null,
        }),
      );
    }
    return out;
  }, [team.data, team.active, objectives.data, reviews.data, feedbacks.data, pulses.data, missions.data, delegations.data, levels.data]);

  return { data, isLoading: !data && [team, reviews, feedbacks, pulses, missions, delegations, levels].some((q) => q.isLoading) };
}
