import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfISOWeek,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { toDate, type DateInput } from './format';

/** Date SQL « AAAA-MM-JJ » en heure locale. */
export const toIsoDate = (d: Date) => format(d, 'yyyy-MM-dd');

/** Lundi de la semaine ISO contenant la date. */
export const weekStart = (v: DateInput) => startOfISOWeek(toDate(v));
export const weekStartIso = (v: DateInput) => toIsoDate(weekStart(v));

/** « S45 » ; avec l'année si demandé : « S45 2026 ». */
export function isoWeekLabel(v: DateInput, withYear = false): string {
  const d = toDate(v);
  const w = String(getISOWeek(d)).padStart(2, '0');
  return withYear ? `S${w} ${getISOWeekYear(d)}` : `S${w}`;
}

/** Les n dernières semaines ISO (lundis), de la plus ancienne à la courante. */
export function lastWeeks(n: number, ref: DateInput = new Date()): string[] {
  const current = weekStart(ref);
  return Array.from({ length: n }, (_, i) => toIsoDate(addWeeks(current, i - n + 1)));
}

/** n semaines ISO à partir de la semaine courante décalée de `offset`. */
export function nextWeeks(n: number, ref: DateInput = new Date(), offset = 0): string[] {
  const current = weekStart(ref);
  return Array.from({ length: n }, (_, i) => toIsoDate(addWeeks(current, i + offset)));
}

/** Premiers jours des n derniers mois (le mois courant inclus). */
export function lastMonths(n: number, ref: DateInput = new Date()): Date[] {
  const current = startOfMonth(toDate(ref));
  return Array.from({ length: n }, (_, i) => subMonths(current, n - 1 - i));
}

export const daysBetween = (from: DateInput, to: DateInput) =>
  differenceInCalendarDays(toDate(to), toDate(from));

export const daysFromToday = (v: DateInput, today: DateInput = new Date()) => daysBetween(today, v);

export const isoAddDays = (v: DateInput, n: number) => toIsoDate(addDays(toDate(v), n));

export const todayIso = () => toIsoDate(new Date());

/** Jours ouvrés (lun.–ven.) entre deux dates incluses. */
export function businessDays(from: DateInput, to: DateInput): number {
  let count = 0;
  for (let d = toDate(from); d <= toDate(to); d = addDays(d, 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}
