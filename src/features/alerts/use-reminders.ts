import { useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { pulseSignals } from '@/features/pulse/lib/pulse';
import { usePulses } from '@/features/pulse/queries';
import { useReviewActions, useReviewRequests, useReviews } from '@/features/reviews/queries';
import { useSettings } from '@/features/settings/queries';
import { useTeamMembers } from '@/features/team/queries';
import { daysFromToday, todayIso } from '@/shared/lib/dates';
import { formatDate, fullName, relativeDays } from '@/shared/lib/format';
import type { Alert } from './lib/alerts';
import { useAlerts } from './queries';

export type Reminder = Pick<Alert, 'id' | 'severity' | 'title' | 'detail' | 'to'>;

const isWeekday = () => new Date().getDay() % 6 !== 0;

/** Rappels automatiques du collaborateur (pouls du jour, préparation d'entretien, actions en retard). */
function useCollaboratorReminders(enabled: boolean): Reminder[] {
  const { profile } = useCurrentUser();
  const reviews = useReviews();
  const actions = useReviewActions();
  const settings = useSettings();
  const pulses = usePulses();

  return useMemo(() => {
    if (!enabled) return [];
    const out: Reminder[] = [];
    const today = todayIso();
    if (isWeekday() && pulses.data && !pulses.data.some((p) => p.collaborator_id === profile.id && p.day === today)) {
      out.push({ id: 'pouls', severity: 'warning', title: 'Votre pouls du jour', detail: 'Humeur, motivation et charge en 10 secondes', to: '/' });
    }
    const limit = settings.data?.prep_reminder_days ?? 3;
    for (const r of reviews.data ?? []) {
      if (r.status !== 'planifie' || r.collaborator_prepared_at) continue;
      const days = daysFromToday(r.scheduled_at.slice(0, 10));
      if (days >= 0 && days <= limit) {
        out.push({ id: `prep-${r.id}`, severity: days <= 1 ? 'danger' : 'warning', title: 'Préparez votre entretien', detail: `Prévu ${relativeDays(days)}, le ${formatDate(r.scheduled_at)}`, to: `/entretiens/${r.id}` });
      }
    }
    for (const a of actions.data ?? []) {
      if (a.owner_id === profile.id && a.status !== 'fait' && a.due_date && a.due_date < today) {
        out.push({ id: `act-${a.id}`, severity: 'danger', title: `Action en retard : ${a.title}`, detail: `Échéance le ${formatDate(a.due_date)}`, to: '/' });
      }
    }
    return out;
  }, [enabled, reviews.data, actions.data, settings.data, pulses.data, profile.id]);
}

/** Côté manager : demandes de one-to-one en attente et signaux du pouls, en tête des alertes. */
function useManagerReminders(enabled: boolean): Reminder[] {
  const alerts = useAlerts();
  const requests = useReviewRequests();
  const pulses = usePulses();
  const team = useTeamMembers();

  return useMemo(() => {
    if (!enabled) return [];
    const out: Reminder[] = [];
    for (const r of requests.data ?? []) {
      if (r.status !== 'en_attente') continue;
      const who = team.byId.get(r.collaborator_id);
      out.push({
        id: `demande-${r.id}`,
        severity: 'danger',
        title: `Demande de one-to-one : ${who ? fullName(who) : 'un collaborateur'}`,
        detail: r.message ? `« ${r.message.slice(0, 80)} »` : r.preferred_date ? `Souhaité le ${formatDate(r.preferred_date)}` : 'À planifier',
        to: '/entretiens',
      });
    }
    for (const s of pulseSignals(pulses.data ?? [], team.active, todayIso())) {
      out.push({ id: `pouls-${s.personId}-${s.kind}`, severity: s.severity, title: s.title, detail: s.detail, to: '/?vue=pouls' });
    }
    return [...out, ...(alerts.data ?? [])];
  }, [enabled, alerts.data, requests.data, pulses.data, team.byId, team.active]);
}

export function useReminders(): Reminder[] {
  const { isManager } = useCurrentUser();
  const manager = useManagerReminders(isManager);
  const own = useCollaboratorReminders(!isManager);
  return isManager ? manager : own;
}
