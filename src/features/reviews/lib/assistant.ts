import type { ObjectiveStatus } from '@/features/objectives/lib/status';
import { hasMoodDrop, type WeatherLike } from '@/features/weather/lib/weather';

export interface AssistantInput {
  objectives: { id: string; title: string; progress: number; status: ObjectiveStatus }[];
  weather: WeatherLike[];
  /** Charge totale par semaine (dernières semaines, de la plus ancienne à la plus récente). */
  loads: { week: string; percent: number }[];
  overloadPct: number;
  feedbacks: { kind: 'point_fort' | 'axe_progres' | 'reconnaissance'; body: string; created_at: string }[];
  openActions: { id: string; title: string; status: string; due_date: string | null }[];
  today: string;
}

export interface Suggestion {
  id: string;
  title: string;
  reason: string;
}

/** Sujets à aborder, déduits des signaux faibles (mêmes règles que les alertes). */
export function suggestTopics(input: AssistantInput): Suggestion[] {
  const out: Suggestion[] = [];
  for (const o of input.objectives) {
    if (o.status === 'a_risque' || o.status === 'en_retard') {
      out.push({ id: `obj-${o.title}`, title: `Faire le point sur « ${o.title} »`, reason: o.status === 'en_retard' ? 'Objectif en retard' : 'Objectif à risque' });
    }
  }
  if (hasMoodDrop(input.weather, 3)) {
    out.push({ id: 'meteo', title: 'Comprendre la baisse de moral des dernières semaines', reason: 'Humeur en baisse sur 3 semaines (pouls)' });
  }
  const recent = input.loads.slice(-3);
  if (recent.filter((l) => l.percent > input.overloadPct).length >= 2) {
    out.push({ id: 'charge', title: 'Rééquilibrer la charge et revoir les priorités', reason: 'Surcharge sur plusieurs semaines, en cours ou à venir' });
  }
  const late = input.openActions.filter((a) => a.due_date && a.due_date < input.today);
  if (late.length) {
    out.push({ id: 'actions', title: `Débloquer ${late.length > 1 ? `${late.length} actions en retard` : 'l’action en retard'}`, reason: 'Plan d’action du dernier entretien' });
  }
  const progress = input.feedbacks.filter((f) => f.kind === 'axe_progres');
  if (progress.length) out.push({ id: 'progres', title: 'Revenir sur les axes de progrès partagés', reason: `${progress.length} feedback(s) depuis le dernier échange` });
  if (out.length === 0) out.push({ id: 'ok', title: 'Aucun signal d’alerte : centrer l’échange sur les projets à venir', reason: 'Indicateurs dans les seuils' });
  return out;
}
