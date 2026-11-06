import type { BadgeTone } from '@/shared/ui/badge';

export interface Allocation {
  collaborator_id: string;
  week_start: string;
  percent: number;
}

export type LoadLevel = 'surcharge' | 'normale' | 'sous_charge' | 'vide';

export const LOAD_META: Record<LoadLevel, { label: string; tone: BadgeTone }> = {
  surcharge: { label: 'Surcharge', tone: 'danger' },
  normale: { label: 'Normale', tone: 'neutral' },
  sous_charge: { label: 'Sous-charge', tone: 'warning' },
  vide: { label: 'Non planifiée', tone: 'outline' },
};

/** Charge totale (en % de capacité) par collaborateur et par semaine. */
export function weeklyLoad(allocations: Allocation[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const a of allocations) {
    const person = out.get(a.collaborator_id) ?? new Map<string, number>();
    person.set(a.week_start, (person.get(a.week_start) ?? 0) + a.percent);
    out.set(a.collaborator_id, person);
  }
  return out;
}

export function loadLevel(percent: number | undefined, thresholds: { overload_pct: number; underload_pct: number }): LoadLevel {
  if (percent === undefined || percent === 0) return 'vide';
  if (percent > thresholds.overload_pct) return 'surcharge';
  if (percent < thresholds.underload_pct) return 'sous_charge';
  return 'normale';
}

/** Plus longue série de semaines consécutives en surcharge, parmi les semaines données (triées). */
export function longestOverloadStreak(byWeek: Map<string, number> | undefined, weeks: string[], overloadPct: number): string[] {
  let best: string[] = [];
  let current: string[] = [];
  for (const w of weeks) {
    if ((byWeek?.get(w) ?? 0) > overloadPct) {
      current = [...current, w];
      if (current.length > best.length) best = current;
    } else current = [];
  }
  return best;
}
