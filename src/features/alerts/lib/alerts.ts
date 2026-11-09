import { nextRegulatoryDue, prepStatus, type ReviewKind, type ReviewLike } from '@/features/reviews/lib/review-rules';
import { hasMoodDrop, type WeatherLike } from '@/features/weather/lib/weather';
import { longestOverloadStreak, weeklyLoad, type Allocation } from '@/features/workload/lib/load';
import { daysBetween, isoWeekLabel } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import type { ObjectiveStatus } from '@/features/objectives/lib/status';
import type { Signal } from '@/features/pulse/lib/pulse';

export type AlertKind = 'decrochage' | 'pouls' | 'echeances' | 'reconnaissance' | 'objectif' | 'one_to_one' | 'surcharge' | 'meteo' | 'echeance' | 'preparation';
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
  decrochage: 'Signal faible',
  pouls: 'Pouls',
  echeances: 'Échéances',
  reconnaissance: 'Reconnaissance',
  objectif: 'Objectif',
  one_to_one: '1 à 1',
  surcharge: 'Charge',
  meteo: 'Humeur',
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
  /** Signaux du pouls du jour (moral bas, baisse, motivation, surcharge, silence). */
  pulseSignals?: Signal[];
  /** Tâches non terminées dont l'échéance est passée. */
  lateTasks?: { assignee_id: string | null; title: string; due_date: string | null }[];
  /** Feedbacks de reconnaissance partagés (levier DREAM « Reconnaissance »). */
  recognitions?: { collaborator_id: string; created_at: string }[];
}

const RETREAT: Signal['kind'][] = ['moral_bas', 'en_baisse', 'motivation_basse', 'silence'];

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
      const signals = (input.pulseSignals ?? []).filter((s) => s.personId === p.id);
      const late = (input.lateTasks ?? []).filter((t) => t.assignee_id === p.id);
      const retreat = signals.filter((s) => RETREAT.includes(s.kind));
      if (retreat.length > 0 && late.length >= 2) {
        // Le scénario type : un collaborateur en retrait qui manque ses échéances. Comprendre avant de juger.
        alerts.push({
          id: `decrochage-${p.id}`,
          kind: 'decrochage',
          severity: 'danger',
          personId: p.id,
          title: `${name(p)} en retrait : à comprendre en 1 à 1`,
          detail: `${retreat.map((s) => s.detail).join(' · ')} · ${late.length} échéances manquées`,
          to: `/equipe/${p.id}`,
        });
      } else {
        for (const s of signals) {
          alerts.push({ id: `pouls-${s.kind}-${p.id}`, kind: 'pouls', severity: s.severity, personId: p.id, title: s.title, detail: s.detail, to: '/pouls' });
        }
        if (late.length > 0) {
          alerts.push({
            id: `late-${p.id}`,
            kind: 'echeances',
            severity: late.length >= 2 ? 'danger' : 'warning',
            personId: p.id,
            title: `${late.length > 1 ? `${late.length} échéances manquées` : 'Échéance manquée'} : ${name(p)}`,
            detail: late.map((t) => t.title).join(' · '),
            to: '/taches',
          });
        }
      }
      if (input.recognitions) {
        const last = input.recognitions.filter((r) => r.collaborator_id === p.id).map((r) => r.created_at.slice(0, 10)).sort().pop();
        const days = last ? daysBetween(last, today) : null;
        if (days === null || days > 30) {
          alerts.push({
            id: `reco-${p.id}`,
            kind: 'reconnaissance',
            severity: 'warning',
            personId: p.id,
            title: `Aucune reconnaissance pour ${name(p)} ${days === null ? 'à ce jour' : `depuis ${days} jours`}`,
            detail: 'Levier DREAM « Reconnaissance » : nommer une réussite concrète',
            to: `/feedbacks?nouveau=1&collaborateur=${p.id}&type=reconnaissance`,
          });
        }
      }
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
          title: `${name(p)} sans 1 à 1 depuis ${since === null ? 'son arrivée' : `${since} jours`}`,
          detail: lastOne ? `Dernier échange le ${formatDate(lastOne.scheduled_at)}` : 'Aucun 1 à 1 enregistré',
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

      if (!input.pulseSignals && hasMoodDrop(input.weather.filter((w) => w.collaborator_id === p.id), s.weather_drop_weeks)) {
        alerts.push({
          id: `meteo-${p.id}`,
          kind: 'meteo',
          severity: 'warning',
          personId: p.id,
          title: `Humeur de ${name(p)} en baisse depuis ${s.weather_drop_weeks} semaines`,
          detail: 'Humeur déclarée en recul chaque semaine',
          to: '/pouls',
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
  // Les signaux faibles sur les personnes passent avant les rappels administratifs.
  const order: AlertKind[] = ['decrochage', 'pouls', 'echeances', 'one_to_one', 'objectif', 'preparation', 'reconnaissance', 'surcharge', 'meteo', 'echeance'];
  const rank = (a: Alert) => (a.severity === 'danger' ? 0 : 100) + order.indexOf(a.kind);
  return alerts.sort((a, b) => rank(a) - rank(b));
}
