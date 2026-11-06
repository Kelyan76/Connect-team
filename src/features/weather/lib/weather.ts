export interface WeatherLike {
  collaborator_id: string;
  week_start: string;
  mood: number;
  workload: number;
}

export const MOOD_LABEL: Record<number, string> = { 1: 'Très difficile', 2: 'Difficile', 3: 'Correcte', 4: 'Bonne', 5: 'Très bonne' };
export const WORKLOAD_LABEL: Record<number, string> = { 1: 'Très faible', 2: 'Faible', 3: 'Adaptée', 4: 'Élevée', 5: 'Excessive' };

export function averageBy(entries: WeatherLike[], key: 'mood' | 'workload'): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((s, e) => s + e[key], 0) / entries.length;
}

/** Moyenne d'équipe par semaine, dans l'ordre des semaines demandées. */
export function teamSeries(entries: WeatherLike[], weeks: string[], key: 'mood' | 'workload'): (number | null)[] {
  return weeks.map((w) => averageBy(entries.filter((e) => e.week_start === w), key));
}

/**
 * Baisse sur N semaines : les N+1 dernières saisies consécutives ne remontent jamais
 * et perdent au moins 2 points au total.
 */
export function hasMoodDrop(entries: WeatherLike[], weeks: number): boolean {
  const sorted = [...entries].sort((a, b) => a.week_start.localeCompare(b.week_start)).slice(-(weeks + 1));
  if (sorted.length < weeks + 1) return false;
  for (let i = 1; i < sorted.length; i += 1) if (sorted[i].mood > sorted[i - 1].mood) return false;
  return sorted[0].mood - sorted[sorted.length - 1].mood >= 2;
}
