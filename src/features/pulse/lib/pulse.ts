import { Annoyed, Battery, BatteryFull, BatteryLow, BatteryMedium, Frown, Laugh, Meh, Smile, Zap, type LucideIcon } from 'lucide-react';
import { isoAddDays } from '@/shared/lib/dates';
import type { Tables } from '@/shared/types/database';

export type Pulse = Tables<'daily_pulses'>;

export interface ScaleStep {
  label: string;
  icon: LucideIcon;
}

export const MOOD: Record<number, ScaleStep> = {
  1: { label: 'Difficile', icon: Frown },
  2: { label: 'Pas top', icon: Annoyed },
  3: { label: 'Correct', icon: Meh },
  4: { label: 'Bien', icon: Smile },
  5: { label: 'Excellent', icon: Laugh },
};

export const ENERGY: Record<number, ScaleStep> = {
  1: { label: 'À plat', icon: BatteryLow },
  2: { label: 'Faible', icon: Battery },
  3: { label: 'Moyenne', icon: BatteryMedium },
  4: { label: 'Motivé', icon: BatteryFull },
  5: { label: 'À fond', icon: Zap },
};

/**
 * Couleurs du pouls, une par niveau (classes complètes pour que Tailwind les génère).
 * solid : fond plein + texte blanc ; soft : fond teinté + icône colorée ; dot : pastille.
 */
export const MOOD_COLOR: Record<number, { solid: string; soft: string; dot: string; text: string; wash: string }> = {
  1: { solid: 'bg-mood-1 text-white border-mood-1', soft: 'bg-mood-1/10 text-mood-1 border-mood-1/20', dot: 'bg-mood-1', text: 'text-mood-1', wash: 'from-mood-1/15' },
  2: { solid: 'bg-mood-2 text-white border-mood-2', soft: 'bg-mood-2/10 text-mood-2 border-mood-2/20', dot: 'bg-mood-2', text: 'text-mood-2', wash: 'from-mood-2/15' },
  3: { solid: 'bg-mood-3 text-white border-mood-3', soft: 'bg-mood-3/10 text-mood-3 border-mood-3/25', dot: 'bg-mood-3', text: 'text-mood-3', wash: 'from-mood-3/15' },
  4: { solid: 'bg-mood-4 text-white border-mood-4', soft: 'bg-mood-4/10 text-mood-4 border-mood-4/20', dot: 'bg-mood-4', text: 'text-mood-4', wash: 'from-mood-4/15' },
  5: { solid: 'bg-mood-5 text-white border-mood-5', soft: 'bg-mood-5/10 text-mood-5 border-mood-5/20', dot: 'bg-mood-5', text: 'text-mood-5', wash: 'from-mood-5/15' },
};

export const ENERGY_COLOR: Record<number, { solid: string; soft: string; dot: string; text: string }> = {
  1: { solid: 'bg-energy-1 text-white border-energy-1', soft: 'bg-energy-1/10 text-energy-1 border-energy-1/20', dot: 'bg-energy-1', text: 'text-energy-1' },
  2: { solid: 'bg-energy-2 text-white border-energy-2', soft: 'bg-energy-2/10 text-energy-2 border-energy-2/20', dot: 'bg-energy-2', text: 'text-energy-2' },
  3: { solid: 'bg-energy-3 text-white border-energy-3', soft: 'bg-energy-3/10 text-energy-3 border-energy-3/20', dot: 'bg-energy-3', text: 'text-energy-3' },
  4: { solid: 'bg-energy-4 text-white border-energy-4', soft: 'bg-energy-4/10 text-energy-4 border-energy-4/20', dot: 'bg-energy-4', text: 'text-energy-4' },
  5: { solid: 'bg-energy-5 text-white border-energy-5', soft: 'bg-energy-5/10 text-energy-5 border-energy-5/20', dot: 'bg-energy-5', text: 'text-energy-5' },
};

export type PulseTone = 'danger' | 'warning' | 'success';
export const toneOf = (v: number): PulseTone => (v <= 2 ? 'danger' : v === 3 ? 'warning' : 'success');

const isWeekend = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`).getDay();
  return d === 0 || d === 6;
};

/** Jour ouvré précédent (lundi → vendredi précédent). */
export function previousWorkday(iso: string): string {
  let d = isoAddDays(iso, -1);
  while (isWeekend(d)) d = isoAddDays(d, -1);
  return d;
}

/** Derniers jours ouvrés, du plus ancien au plus récent, aujourd'hui inclus s'il est ouvré. */
export function lastWorkdays(today: string, count: number): string[] {
  const out: string[] = [];
  let d = isWeekend(today) ? previousWorkday(today) : today;
  while (out.length < count) {
    out.unshift(d);
    d = previousWorkday(d);
  }
  return out;
}

/**
 * Série : nombre de jours ouvrés consécutifs avec un pouls, en remontant depuis aujourd'hui
 * (ou depuis le dernier jour ouvré si aujourd'hui n'est pas encore saisi : la série n'est pas perdue avant le soir).
 */
export function streak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : previousWorkday(today);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = previousWorkday(cursor);
  }
  return n;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export type SignalKind = 'moral_bas' | 'en_baisse' | 'motivation_basse' | 'silence';

export interface Signal {
  personId: string;
  kind: SignalKind;
  severity: 'danger' | 'warning';
  title: string;
  detail: string;
}

/**
 * Signaux d'alerte pour le manager, à partir des derniers pouls de chaque collaborateur :
 * moral bas (moyenne des 3 derniers ≤ 2), moral en baisse (−1 point vs les 7 précédents),
 * motivation basse, ou silence (aucun pouls depuis 3 jours ouvrés).
 */
export function pulseSignals(pulses: Pulse[], people: { id: string; first_name: string }[], today: string): Signal[] {
  const out: Signal[] = [];
  const recentDays = new Set(lastWorkdays(today, 4).slice(0, 3)); // 3 jours ouvrés avant aujourd'hui
  for (const p of people) {
    const mine = pulses.filter((x) => x.collaborator_id === p.id).sort((a, b) => b.day.localeCompare(a.day));
    const last3 = mine.slice(0, 3);
    const before = mine.slice(3, 10);
    const mood3 = mean(last3.map((x) => x.mood));
    const moodBefore = mean(before.map((x) => x.mood));
    const energy3 = mean(last3.map((x) => x.energy));
    if (mine.length > 0 && !mine.some((x) => recentDays.has(x.day) || x.day === today)) {
      out.push({ personId: p.id, kind: 'silence', severity: 'warning', title: `${p.first_name} ne répond plus`, detail: 'Aucun pouls depuis 3 jours ouvrés' });
      continue;
    }
    if (last3.length >= 2 && mood3 !== null && mood3 <= 2) {
      out.push({ personId: p.id, kind: 'moral_bas', severity: 'danger', title: `Moral bas : ${p.first_name}`, detail: `Humeur moyenne ${mood3.toFixed(1).replace('.', ',')} / 5 sur les derniers jours` });
    } else if (mood3 !== null && moodBefore !== null && moodBefore - mood3 >= 1) {
      out.push({ personId: p.id, kind: 'en_baisse', severity: 'warning', title: `Humeur en baisse : ${p.first_name}`, detail: `${moodBefore.toFixed(1).replace('.', ',')} → ${mood3.toFixed(1).replace('.', ',')} / 5` });
    }
    if (last3.length >= 2 && energy3 !== null && energy3 <= 2) {
      out.push({ personId: p.id, kind: 'motivation_basse', severity: 'warning', title: `Motivation basse : ${p.first_name}`, detail: `Motivation moyenne ${energy3.toFixed(1).replace('.', ',')} / 5` });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1));
}

export function average(pulses: Pulse[], key: 'mood' | 'energy'): number | null {
  return mean(pulses.map((p) => p[key]));
}
