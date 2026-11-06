import { useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useReviewActions, useReviews } from '@/features/reviews/queries';
import { useSettings } from '@/features/settings/queries';
import { useWeather } from '@/features/weather/queries';
import { daysFromToday, todayIso, weekStartIso } from '@/shared/lib/dates';
import { formatDate, relativeDays } from '@/shared/lib/format';
import type { Alert } from './lib/alerts';
import { useAlerts } from './queries';

export type Reminder = Pick<Alert, 'id' | 'severity' | 'title' | 'detail' | 'to'>;

/** Rappels automatiques du collaborateur (préparation d'entretien, météo, actions en retard). */
function useCollaboratorReminders(enabled: boolean): Reminder[] {
  const { profile } = useCurrentUser();
  const reviews = useReviews();
  const weather = useWeather();
  const actions = useReviewActions();
  const settings = useSettings();

  return useMemo(() => {
    if (!enabled) return [];
    const out: Reminder[] = [];
    const limit = settings.data?.prep_reminder_days ?? 3;
    for (const r of reviews.data ?? []) {
      if (r.status !== 'planifie' || r.collaborator_prepared_at) continue;
      const days = daysFromToday(r.scheduled_at.slice(0, 10));
      if (days >= 0 && days <= limit) {
        out.push({ id: `prep-${r.id}`, severity: days <= 1 ? 'danger' : 'warning', title: 'Préparez votre entretien', detail: `Prévu ${relativeDays(days)}, le ${formatDate(r.scheduled_at)}`, to: `/entretiens/${r.id}` });
      }
    }
    const thisWeek = weekStartIso(new Date());
    if (weather.data && !weather.data.some((w) => w.collaborator_id === profile.id && w.week_start === thisWeek)) {
      out.push({ id: 'meteo', severity: 'warning', title: 'Météo de la semaine à saisir', detail: 'Deux questions, moins d’une minute', to: '/meteo' });
    }
    const today = todayIso();
    for (const a of actions.data ?? []) {
      if (a.owner_id === profile.id && a.status !== 'fait' && a.due_date && a.due_date < today) {
        out.push({ id: `act-${a.id}`, severity: 'danger', title: `Action en retard : ${a.title}`, detail: `Échéance le ${formatDate(a.due_date)}`, to: '/' });
      }
    }
    return out;
  }, [enabled, reviews.data, weather.data, actions.data, settings.data, profile.id]);
}

export function useReminders(): Reminder[] {
  const { isManager } = useCurrentUser();
  const alerts = useAlerts();
  const own = useCollaboratorReminders(!isManager);
  return isManager ? (alerts.data ?? []) : own;
}

