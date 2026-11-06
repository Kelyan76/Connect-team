import { isoAddDays } from '@/shared/lib/dates';
import { toDate } from '@/shared/lib/format';

export interface AbsenceLike {
  collaborator_id: string;
  start_date: string;
  end_date: string;
  status: 'en_attente' | 'validee' | 'refusee';
}

export const isWorkingDay = (iso: string) => {
  const d = toDate(iso).getDay();
  return d !== 0 && d !== 6;
};

/** Collaborateurs absents (ou en demande) par jour ouvré, demandes refusées exclues. */
export function absentByDay(absences: AbsenceLike[], from: string, to: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const a of absences) {
    if (a.status === 'refusee') continue;
    for (let d = a.start_date < from ? from : a.start_date; d <= a.end_date && d <= to; d = isoAddDays(d, 1)) {
      if (!isWorkingDay(d)) continue;
      const set = out.get(d) ?? new Set<string>();
      set.add(a.collaborator_id);
      out.set(d, set);
    }
  }
  return out;
}

/** Jours ouvrés où le nombre d'absents dépasse le seuil de l'équipe. */
export function crowdedDays(absences: AbsenceLike[], from: string, to: string, maxAbsent: number): string[] {
  return [...absentByDay(absences, from, to)]
    .filter(([, people]) => people.size > maxAbsent)
    .map(([day]) => day)
    .sort();
}

/** Jours ouvrés d'une absence. */
export function workingDaysCount(start: string, end: string): number {
  let n = 0;
  for (let d = start; d <= end; d = isoAddDays(d, 1)) if (isWorkingDay(d)) n += 1;
  return n;
}
