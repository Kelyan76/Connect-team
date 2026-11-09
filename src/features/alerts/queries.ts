import { useMemo } from 'react';
import { useFeedbacks } from '@/features/feedback/queries';
import { useObjectives } from '@/features/objectives/queries';
import { pulseSignals } from '@/features/pulse/lib/pulse';
import { usePulses } from '@/features/pulse/queries';
import { useReviews } from '@/features/reviews/queries';
import { useSettings } from '@/features/settings/queries';
import { useTasks } from '@/features/tasks/queries';
import { useTeamMembers } from '@/features/team/queries';
import { useWeather } from '@/features/weather/queries';
import { useAllocations } from '@/features/workload/queries';
import { nextWeeks, todayIso } from '@/shared/lib/dates';
import { computeAlerts, type Alert } from './lib/alerts';

/** Alertes du manager, calculées à partir des données de l'équipe et des seuils paramétrés. */
export function useAlerts(): { data: Alert[] | undefined; isLoading: boolean; error: unknown } {
  const team = useTeamMembers();
  const objectives = useObjectives();
  const reviews = useReviews();
  const allocations = useAllocations();
  const weather = useWeather();
  const settings = useSettings();
  const pulses = usePulses();
  const tasks = useTasks();
  const feedbacks = useFeedbacks();

  const data = useMemo(() => {
    if (!team.data || !objectives.data || !reviews.data || !allocations.data || !weather.data || !settings.data || !pulses.data || !tasks.data || !feedbacks.data) return undefined;
    const today = todayIso();
    return computeAlerts({
      today,
      people: team.active,
      objectives: objectives.data,
      reviews: reviews.data,
      allocations: allocations.data,
      // Fenêtre observée : 2 semaines passées, la semaine en cours et 3 à venir.
      weeks: nextWeeks(6, new Date(), -2),
      weather: weather.data,
      settings: settings.data,
      pulseSignals: pulseSignals(pulses.data, team.active, today),
      lateTasks: tasks.data.filter((t) => t.status !== 'termine' && t.due_date !== null && t.due_date < today),
      recognitions: feedbacks.data.filter((f) => f.is_shared && (f.kind === 'reconnaissance' || f.kind === 'point_fort')),
    });
  }, [team.data, team.active, objectives.data, reviews.data, allocations.data, weather.data, settings.data, pulses.data, tasks.data, feedbacks.data]);

  return {
    data,
    isLoading: [team, reviews, allocations, weather, settings, pulses, tasks, feedbacks].some((q) => q.isLoading) || objectives.isLoading,
    error: team.error ?? objectives.error ?? reviews.error ?? allocations.error ?? weather.error ?? settings.error,
  };
}
