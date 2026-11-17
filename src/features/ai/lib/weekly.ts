/**
 * « La semaine de l'équipe » : 5 lignes rédigées par l'IA à partir du résumé de suivi (prénoms uniquement).
 * Calculé une fois par semaine et par équipe, puis gardé en base.
 */
import { extractJson } from './ai';

export interface WeeklyLine {
  text: string;
  /** Prénom concerné (pour proposer l'action correspondante), s'il y en a un. */
  person?: string;
}

export interface WeeklyDigest {
  bien: WeeklyLine;
  priorite: WeeklyLine;
  echeances: WeeklyLine;
  reconnaissance: WeeklyLine;
  conseil: WeeklyLine;
}

export const WEEKLY_KEYS = ['bien', 'priorite', 'echeances', 'reconnaissance', 'conseil'] as const;

export function weeklyPrompt(managerFirstName: string, weekLabel: string): string {
  return [
    `Rédige pour ${managerFirstName} « La semaine de l’équipe » (${weekLabel}) : 5 lignes, à partir des données de suivi ci-dessus.`,
    '- bien : qui va bien et pourquoi (faits) ;',
    '- priorite : la personne à voir en priorité cette semaine et pourquoi, sans jugement ;',
    '- echeances : les échéances ou retards à surveiller ;',
    '- reconnaissance : une reconnaissance concrète à faire, à qui et pour quoi ;',
    '- conseil : une action simple de management pour la semaine, tirée des outils du cours.',
    'Chaque ligne : une phrase de 25 mots au plus, ton bienveillant, factuel. N’invente rien : si une information manque, dis-le simplement.',
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"bien":{"text":"...","person":"Prénom"},"priorite":{"text":"...","person":"Prénom"},"echeances":{"text":"..."},"reconnaissance":{"text":"...","person":"Prénom"},"conseil":{"text":"..."}}. Le champ person est facultatif.',
  ].join('\n');
}

const line = (v: unknown): WeeklyLine | null => {
  if (typeof v === 'string' && v.trim()) return { text: v.trim().slice(0, 300) };
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.text !== 'string' || !o.text.trim()) return null;
  const person =
    typeof o.person === 'string' && o.person.trim() ? o.person.trim().slice(0, 60) : undefined;
  return { text: o.text.trim().slice(0, 300), ...(person ? { person } : {}) };
};

/** Lecture tolérante : les 5 lignes sont exigées (texte simple ou objet {text, person}). */
export function parseWeekly(value: unknown): WeeklyDigest | null {
  const raw = typeof value === 'string' ? extractJson(value) : value;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const out: Partial<WeeklyDigest> = {};
  for (const k of WEEKLY_KEYS) {
    const l = line(o[k]);
    if (!l) return null;
    out[k] = l;
  }
  return out as WeeklyDigest;
}
