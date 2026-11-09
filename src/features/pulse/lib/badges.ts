import { previousWorkday, streak } from './pulse';

/**
 * Séries et badges du pouls : un petit encouragement visible par le collaborateur seul.
 * Jamais transmis au manager : le pouls reste facultatif et ne se « note » pas.
 */

export interface Badge {
  id: string;
  label: string;
  hint: string;
  got: boolean;
}

/** Plus longue série de jours ouvrés consécutifs avec un pouls (le week-end ne coupe pas la série). */
export function bestStreak(days: Iterable<string>): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  sorted.forEach((d, i) => {
    run = i > 0 && previousWorkday(d) === sorted[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function pulseBadges(input: { days: string[]; notes: number; today: string }): { current: number; best: number; badges: Badge[]; next: Badge | null } {
  const current = streak(input.days, input.today);
  const best = Math.max(bestStreak(input.days), current);
  const total = new Set(input.days).size;
  const badges: Badge[] = [
    { id: 'premier', label: 'Premier pouls', hint: 'Donner son pouls une première fois', got: total >= 1 },
    { id: 'serie3', label: '3 jours d’affilée', hint: '3 jours ouvrés de suite', got: best >= 3 },
    { id: 'semaine', label: 'Semaine complète', hint: '5 jours ouvrés de suite', got: best >= 5 },
    { id: 'mot', label: 'Un mot pour l’équipe', hint: 'Ajouter un mot à son pouls', got: input.notes >= 1 },
    { id: 'serie10', label: '10 jours d’affilée', hint: '10 jours ouvrés de suite', got: best >= 10 },
    { id: 'fidele', label: '50 pouls', hint: '50 jours de pouls au total', got: total >= 50 },
    { id: 'serie20', label: 'Un mois sans faillir', hint: '20 jours ouvrés de suite', got: best >= 20 },
  ];
  return { current, best, badges, next: badges.find((b) => !b.got) ?? null };
}
