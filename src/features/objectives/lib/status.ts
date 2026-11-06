import type { BadgeTone } from '@/shared/ui/badge';
import { daysBetween } from '@/shared/lib/dates';

export interface KeyResultLike {
  start_value: number;
  target_value: number;
  current_value: number;
}

export interface ObjectiveLike {
  start_date: string;
  due_date: string;
}

export type ObjectiveStatus = 'en_avance' | 'dans_les_temps' | 'a_risque' | 'en_retard';

export const OBJECTIVE_STATUS: Record<ObjectiveStatus, { label: string; tone: BadgeTone }> = {
  en_avance: { label: 'En avance', tone: 'success' },
  dans_les_temps: { label: 'Dans les temps', tone: 'accent' },
  a_risque: { label: 'À risque', tone: 'warning' },
  en_retard: { label: 'En retard', tone: 'danger' },
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Avancement d'un résultat clé (0–1), y compris quand la cible est inférieure au départ (délai à réduire). */
export function keyResultProgress(kr: KeyResultLike): number {
  const span = kr.target_value - kr.start_value;
  if (span === 0) return 1;
  return clamp((kr.current_value - kr.start_value) / span);
}

export function objectiveProgress(krs: KeyResultLike[]): number {
  if (krs.length === 0) return 0;
  return krs.reduce((sum, kr) => sum + keyResultProgress(kr), 0) / krs.length;
}

/** Part du temps écoulé entre le début et l'échéance (0–1). */
export function elapsedRatio(obj: ObjectiveLike, today: string): number {
  const total = daysBetween(obj.start_date, obj.due_date);
  if (total <= 0) return 1;
  return clamp(daysBetween(obj.start_date, today) / total);
}

/**
 * Statut automatique : on compare l'avancement réel au temps écoulé.
 * - échéance dépassée sans atteinte → en retard
 * - avance ≥ 10 points → en avance ; écart ≤ 10 points → dans les temps
 * - retard de 10 à 25 points → à risque ; au-delà → en retard
 */
export function objectiveStatus(obj: ObjectiveLike, progress: number, today: string): ObjectiveStatus {
  if (progress >= 1) return 'en_avance';
  if (today > obj.due_date) return 'en_retard';
  const gap = progress - elapsedRatio(obj, today);
  if (gap >= 0.1) return 'en_avance';
  if (gap >= -0.1) return 'dans_les_temps';
  if (gap >= -0.25) return 'a_risque';
  return 'en_retard';
}

/** Valeur d'un résultat clé formatée avec son unité. */
export function formatKrValue(value: number, unit: string): string {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
  if (unit === '%') return `${n}${String.fromCharCode(0x202f)}%`;
  if (unit === 'k€') return `${n}${String.fromCharCode(0x202f)}k€`;
  if (unit === 'h' || unit === 'j') return `${n}${String.fromCharCode(0x202f)}${unit}`;
  return `${n} ${unit}`;
}
