import { endOfMonth } from 'date-fns';
import { keyResultProgress } from '@/features/objectives/lib/status';
import { toIsoDate } from '@/shared/lib/dates';

interface Obj {
  id: string;
  start_date: string;
  due_date: string;
}
interface Kr {
  id: string;
  objective_id: string;
  start_value: number;
  target_value: number;
  current_value: number;
}
interface Hist {
  key_result_id: string;
  value: number;
  recorded_at: string;
}

/** Taux d'atteinte moyen des objectifs actifs à une date donnée, reconstitué depuis l'historique. */
export function attainmentAt(date: string, objectives: Obj[], krs: Kr[], history: Hist[]): number | null {
  const active = objectives.filter((o) => o.start_date <= date);
  if (active.length === 0) return null;
  const values = active.map((o) => {
    const mine = krs.filter((k) => k.objective_id === o.id);
    if (mine.length === 0) return 0;
    const sum = mine.reduce((s, k) => {
      const past = history.filter((h) => h.key_result_id === k.id && h.recorded_at.slice(0, 10) <= date);
      const value = past.length ? past[past.length - 1].value : k.start_value;
      return s + keyResultProgress({ ...k, current_value: value });
    }, 0);
    return sum / mine.length;
  });
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Fin de chaque mois, bornée à aujourd'hui pour le mois en cours. */
export function monthCheckpoints(months: Date[], today: string): string[] {
  return months.map((m) => {
    const end = toIsoDate(endOfMonth(m));
    return end > today ? today : end;
  });
}

/** Moyenne d'une série de valeurs, en ignorant les absences de donnée. */
export function mean(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
