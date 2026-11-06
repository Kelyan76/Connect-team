import { endOfMonth, endOfQuarter, endOfYear, startOfMonth, startOfQuarter, startOfYear, subMonths } from 'date-fns';
import { toIsoDate } from './dates';
import { formatDate, formatMonth } from './format';

export type PeriodPreset = 'mois' | 'trimestre' | 'semestre' | 'annee';

export interface Period {
  preset: PeriodPreset;
  from: string;
  to: string;
  label: string;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  mois: 'Mois en cours',
  trimestre: 'Trimestre en cours',
  semestre: '6 derniers mois',
  annee: 'Année en cours',
};

export function resolvePeriod(preset: PeriodPreset, ref: Date = new Date()): Period {
  let from: Date;
  let to: Date;
  let label: string;
  switch (preset) {
    case 'mois':
      from = startOfMonth(ref);
      to = endOfMonth(ref);
      label = formatMonth(ref);
      break;
    case 'trimestre':
      from = startOfQuarter(ref);
      to = endOfQuarter(ref);
      label = `T${Math.floor(ref.getMonth() / 3) + 1} ${ref.getFullYear()}`;
      break;
    case 'semestre':
      from = startOfMonth(subMonths(ref, 5));
      to = endOfMonth(ref);
      label = `${formatDate(from)} – ${formatDate(to)}`;
      break;
    case 'annee':
      from = startOfYear(ref);
      to = endOfYear(ref);
      label = String(ref.getFullYear());
      break;
  }
  return { preset, from: toIsoDate(from), to: toIsoDate(to), label };
}
