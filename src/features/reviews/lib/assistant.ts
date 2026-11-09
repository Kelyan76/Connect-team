import type { ObjectiveStatus } from '@/features/objectives/lib/status';
import { hasMoodDrop, type WeatherLike } from '@/features/weather/lib/weather';

export interface AssistantInput {
  objectives: { id: string; title: string; progress: number; status: ObjectiveStatus }[];
  weather: WeatherLike[];
  /** Charge ressentie au pouls (1 à 5), des jours les plus anciens aux plus récents. */
  recentWorkload: number[];
  feedbacks: { kind: string; body: string; created_at: string; is_shared: boolean }[];
  openActions: { id: string; title: string; status: string; due_date: string | null }[];
  lateTasks: { title: string; due_date: string | null }[];
  daysSinceRecognition: number | null;
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
  const moodDrop = hasMoodDrop(input.weather, 2);
  if (moodDrop && input.lateTasks.length >= 2) {
    out.push({
      id: 'retrait',
      title: 'Comprendre ce qui a changé pour lui, avant de parler des échéances',
      reason: `Humeur en baisse et ${input.lateTasks.length} échéances manquées : écouter d’abord (10 minutes pour lui)`,
    });
  } else if (moodDrop) {
    out.push({ id: 'meteo', title: 'Comprendre la baisse de moral des dernières semaines', reason: 'Humeur en baisse (pouls)' });
  }
  for (const o of input.objectives) {
    if (o.status === 'a_risque' || o.status === 'en_retard') {
      out.push({ id: `obj-${o.id}`, title: `Faire le point sur « ${o.title} »`, reason: o.status === 'en_retard' ? 'Objectif en retard' : 'Objectif à risque' });
    }
  }
  const recent = input.recentWorkload.slice(-5);
  if (recent.length >= 3 && recent.reduce((s, w) => s + w, 0) / recent.length >= 4.2) {
    out.push({ id: 'charge', title: 'Rééquilibrer la charge et revoir les priorités', reason: 'Charge ressentie élevée au pouls ces derniers jours' });
  }
  const late = input.openActions.filter((a) => a.due_date && a.due_date < input.today);
  if (late.length) {
    out.push({ id: 'actions', title: `Revenir sur ${late.length > 1 ? `${late.length} engagements non tenus` : 'l’engagement non tenu'}`, reason: 'Engagements du dernier 1 à 1 : objectif fixé, résultat, écart, ajustement' });
  }
  const toDeliver = input.feedbacks.filter((f) => !f.is_shared && (f.kind === 'amelioration' || f.kind === 'recadrage' || f.kind === 'axe_progres'));
  if (toDeliver.length) out.push({ id: 'desc', title: 'Donner le feedback DESC préparé', reason: `${toDeliver.length} feedback(s) préparé(s), pas encore partagé(s)` });
  if (input.daysSinceRecognition === null || input.daysSinceRecognition > 21) {
    out.push({
      id: 'reco',
      title: 'Nommer une réussite concrète (levier Reconnaissance)',
      reason: input.daysSinceRecognition === null ? 'Aucune reconnaissance partagée' : `Aucune reconnaissance depuis ${input.daysSinceRecognition} jours`,
    });
  }
  if (out.length === 0) out.push({ id: 'ok', title: 'Aucun signal d’alerte : centrer l’échange sur ses projets et son développement', reason: 'Indicateurs dans les seuils' });
  return out;
}
