import { nextRegulatoryDue, prepStatus, type ReviewKind, type ReviewLike } from '@/features/reviews/lib/review-rules';
import { hasMoodDrop, type WeatherLike } from '@/features/weather/lib/weather';
import { longestOverloadStreak, weeklyLoad, type Allocation } from '@/features/workload/lib/load';
import { daysBetween, isoWeekLabel } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import type { ObjectiveStatus } from '@/features/objectives/lib/status';

export type AlertKind = 'objectif' | 'one_to_one' | 'surcharge' | 'meteo' | 'echeance' | 'preparation';
export type Severity = 'danger' | 'warning';

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: Severity;
  personId: string | null;
  title: string;
  detail: string;
  to: string;
}

export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  objectif: 'Objectif',
  one_to_one: 'One-to-one',
  surcharge: 'Charge',
  meteo: 'Météo',
  echeance: 'Échéance réglementaire',
  preparation: 'Préparation',
};

export interface Thresholds {
  no_one_to_one_days: number;
  overload_pct: number;
  overload_weeks: number;
  weather_drop_weeks: number;
  review_due_days: number;
  prep_reminder_days: number;
}

export interface AlertInput {
  today: string;
  people: { id: string; first_name: string; last_name: string; hired_on: string | null }[];
  objectives: { id: string; title: string; owner_id: string | null; status: ObjectiveStatus; due_date: string }[];
  reviews: (ReviewLike & { id: string; collaborator_id: string })[];
  allocations: Allocation[];
  weeks: string[];
  weather: WeatherLike[];
  settings: Thresholds;
}

const name = (p: { first_name: string; last_name: string }) => `${p.first_name} ${p.last_name}`;

/** Alertes du manager, recalculées à chaque affichage selon les seuils paramétrés. */
export function computeAlerts(input: AlertInput): Alert[] {
  const { today, settings: s } = input;
  const alerts: Alert[] = [];
  const day = (iso: string) => iso.slice(0, 10);

  {
    for (const o of input.objectives) {
      if (o.status !== 'a_risque' && o.status !== 'en_retard') continue;
      const owner = input.people.find((p) => p.id === o.owner_id);
      alerts.push({
        id: `obj-${o.id}`,
        kind: 'objectif',
        severity: o.status === 'en_retard' ? 'danger' : 'warning',
        personId: o.owner_id,
        title: `${o.status === 'en_retard' ? 'Objectif en retard' : 'Objectif à risque'} : ${o.title}`,
        detail: `${owner ? name(owner) : "Objectif d'équipe"} · échéance le ${formatDate(o.due_date)}`,
        to: '/objectifs',
      });
    }

    const weekLoads = weeklyLoad(input.allocations);
    for (const p of input.people) {
      const mine = input.reviews.filter((r) => r.collaborator_id === p.id);
      const held = (kind: ReviewKind) =>
        mine.filter((r) => r.kind === kind && r.status === 'termine').sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];

      const lastOne = held('one_to_one');
      const since = lastOne ? daysBetween(day(lastOne.scheduled_at), today) : null;
      if (since === null || since > s.no_one_to_one_days) {
        alerts.push({
          id: `oto-${p.id}`,
          kind: 'one_to_one',
          severity: 'warning',
          personId: p.id,
          title: `${name(p)} sans one-to-one depuis ${since === null ? 'son arrivée' : `${since} jours`}`,
          detail: lastOne ? `Dernier échange le ${formatDate(lastOne.scheduled_at)}` : 'Aucun one-to-one enregistré',
          to: '/entretiens',
        });
      }

      const streak = longestOverloadStreak(weekLoads.get(p.id), input.weeks, s.overload_pct);
      if (streak.length >= s.overload_weeks) {
        alerts.push({
          id: `load-${p.id}`,
          kind: 'surcharge',
          severity: 'danger',
          personId: p.id,
          title: `${name(p)} en surcharge ${streak.length} semaines de suite`,
          detail: `${isoWeekLabel(streak[0])} à ${isoWeekLabel(streak[streak.length - 1])}, au-delà de ${s.overload_pct} % de capacité`,
          to: '/plan-de-charge',
        });
      }

      if (hasMoodDrop(input.weather.filter((w) => w.collaborator_id === p.id), s.weather_drop_weeks)) {
        alerts.push({
          id: `meteo-${p.id}`,
          kind: 'meteo',
          severity: 'warning',
          personId: p.id,
          title: `Météo de ${name(p)} en baisse depuis ${s.weather_drop_weeks} semaines`,
          detail: 'Humeur déclarée en recul chaque semaine',
          to: '/meteo',
        });
      }

      for (const kind of ['annuel', 'professionnel'] as const) {
        const planned = mine.find((r) => r.kind === kind && r.status === 'planifie');
        const due = nextRegulatoryDue(kind, held(kind)?.scheduled_at ?? null, p.hired_on);
        if (planned || !due) continue;
        const left = daysBetween(today, due);
        if (left <= s.review_due_days) {
          alerts.push({
            id: `due-${kind}-${p.id}`,
            kind: 'echeance',
            severity: left < 0 ? 'danger' : 'warning',
            personId: p.id,
            title: `${kind === 'annuel' ? 'Entretien annuel' : 'Entretien professionnel'} de ${name(p)} à planifier`,
            detail: left < 0 ? `Échéance dépassée depuis le ${formatDate(due)}` : `Échéance le ${formatDate(due)}`,
            to: '/entretiens',
          });
        }
      }

      for (const r of mine.filter((x) => x.status === 'planifie')) {
        const left = daysBetween(today, day(r.scheduled_at));
        if (left >= 0 && left <= s.prep_reminder_days && prepStatus(r) !== 'pret') {
          alerts.push({
            id: `prep-${r.id}`,
            kind: 'preparation',
            severity: left <= 1 ? 'danger' : 'warning',
            personId: p.id,
            title: `Entretien de ${name(p)} non préparé`,
            detail: `Prévu le ${formatDate(r.scheduled_at)}${prepStatus(r) === 'a_preparer' ? ', aucune préparation' : ', préparation partielle'}`,
            to: `/entretiens/${r.id}`,
          });
        }
      }
    }
  }
  const rank = (a: Alert) => (a.severity === 'danger' ? 0 : 1);
  return alerts.sort((a, b) => rank(a) - rank(b));
}
