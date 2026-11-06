/** Formats français : « 4 nov. 2026 », « 12 450 € », « 87 % ». */

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const dateShortFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const monthShortFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const intFmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const decFmt = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export type DateInput = string | number | Date;

/** Les dates SQL « AAAA-MM-JJ » sont interprétées en heure locale (pas en UTC). */
export function toDate(value: DateInput): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export const formatDate = (v: DateInput) => dateFmt.format(toDate(v));
export const formatDateShort = (v: DateInput) => dateShortFmt.format(toDate(v));
export const formatTime = (v: DateInput) => timeFmt.format(toDate(v));
export const formatDateTime = (v: DateInput) => `${formatDate(v)} à ${formatTime(v)}`;
export const formatWeekday = (v: DateInput) => weekdayFmt.format(toDate(v));
export function formatMonth(v: DateInput): string {
  const s = monthFmt.format(toDate(v));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const formatMonthShort = (v: DateInput) => monthShortFmt.format(toDate(v)).replace('.', '');

export const formatNumber = (n: number) => intFmt.format(n);
export const formatDecimal = (n: number) => decFmt.format(n);
export const formatEuros = (n: number) => eurFmt.format(n);

/** 0.873 → « 87 % » ; `isRatio = false` pour une valeur déjà exprimée en pourcentage. */
export function formatPercent(value: number, isRatio = true): string {
  return `${intFmt.format(isRatio ? value * 100 : value)}${NNBSP}%`;
}

/** Espace fine insécable, séparateur typographique français avant « % ». */
const NNBSP = String.fromCharCode(0x202f);

export interface NamedPerson {
  first_name: string;
  last_name: string;
}

export const fullName = (p: NamedPerson) => `${p.first_name} ${p.last_name}`;

export const initials = (p: NamedPerson) =>
  `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();

/** « il y a 3 jours », « dans 2 jours », « aujourd'hui ». */
export function relativeDays(days: number): string {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  if (days === -1) return 'hier';
  return days > 0 ? `dans ${days} jours` : `il y a ${-days} jours`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count > 1 ? plural : singular}`;
}
