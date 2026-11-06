import { useMemo } from 'react';
import { useObjectives } from '@/features/objectives/queries';
import { useReviews } from '@/features/reviews/queries';
import { useSettings } from '@/features/settings/queries';
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

  const data = useMemo(() => {
    if (!team.data || !objectives.data || !reviews.data || !allocations.data || !weather.data || !settings.data) return undefined;
    return computeAlerts({
      today: todayIso(),
      people: team.active,
      objectives: objectives.data,
      reviews: reviews.data,
      allocations: allocations.data,
      // Fenêtre observée : 2 semaines passées, la semaine en cours et 3 à venir.
      weeks: nextWeeks(6, new Date(), -2),
      weather: weather.data,
      settings: settings.data,
    });
  }, [team.data, team.active, objectives.data, reviews.data, allocations.data, weather.data, settings.data]);

  return {
    data,
    isLoading: [team, reviews, allocations, weather, settings].some((q) => q.isLoading) || objectives.isLoading,
    error: team.error ?? objectives.error ?? reviews.error ?? allocations.error ?? weather.error ?? settings.error,
  };
}
