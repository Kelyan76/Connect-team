import { addDays, addMonths, endOfMonth, format, isValid } from 'date-fns';

/** Réponse de l'API Echo (transcription + extraction des tâches). */
export interface EchoTask {
  title: string;
  owner?: string | null;
  due?: string | null;
}
export interface EchoResult {
  summary: string;
  tasks: EchoTask[];
}

/** Brouillon d'action proposé au manager avant ajout au plan. */
export interface ActionDraft {
  key: string;
  keep: boolean;
  title: string;
  owner: 'collaborateur' | 'manager';
  due: string;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];

export const normalize = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/** Prochaine occurrence d'un jour de la semaine, strictement après aujourd'hui. */
function nextWeekday(today: Date, day: number): Date {
  const diff = (day - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff);
}

/** Convertit une échéance dite à l'oral (« vendredi », « dans 2 semaines », « le 12 décembre ») en date ISO, sinon ''. */
export function parseDue(text: string | null | undefined, today: Date = new Date()): string {
  if (!text) return '';
  const t = normalize(text);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const isoMatch = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isValid(d) ? iso(d) : '';
  }
  const numeric = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : base.getFullYear();
    let d = new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
    if (!numeric[3] && d < base) d = new Date(year + 1, d.getMonth(), d.getDate());
    return isValid(d) ? iso(d) : '';
  }
  const named = t.match(new RegExp(`\\b(\\d{1,2}|1er) (${MONTHS.join('|')})\\b`));
  if (named) {
    const day = named[1] === '1er' ? 1 : Number(named[1]);
    let d = new Date(base.getFullYear(), MONTHS.indexOf(named[2]), day);
    if (d < base) d = new Date(base.getFullYear() + 1, d.getMonth(), day);
    return iso(d);
  }
  const inN = t.match(/\bdans (\d+|un|une|deux|trois|quatre) (jours?|semaines?|mois)\b/);
  if (inN) {
    const words: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4 };
    const n = words[inN[1]] ?? Number(inN[1]);
    if (inN[2].startsWith('jour')) return iso(addDays(base, n));
    if (inN[2].startsWith('semaine')) return iso(addDays(base, n * 7));
    return iso(addMonths(base, n));
  }
  if (/\bapres-demain\b|\bapres demain\b/.test(t)) return iso(addDays(base, 2));
  if (/\bdemain\b/.test(t)) return iso(addDays(base, 1));
  if (/\baujourd hui\b|\bce soir\b/.test(t)) return iso(base);
  if (/\bfin du mois\b|\bfin de mois\b/.test(t)) return iso(endOfMonth(base));
  if (/\bmois prochain\b/.test(t)) return iso(endOfMonth(addMonths(base, 1)));
  if (/\bsemaine prochaine\b/.test(t)) return iso(addDays(nextWeekday(base, 1), 4));
  if (/\bfin de (la )?semaine\b/.test(t)) return iso(base.getDay() === 5 ? base : nextWeekday(base, 5));

  const day = DAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(t));
  if (day >= 0) return iso(nextWeekday(base, day));
  return '';
}

/** Responsable déduit du nom prononcé : le manager s'il est nommé (« moi », son prénom), sinon le collaborateur. */
export function guessOwner(owner: string | null | undefined, managerFirstName: string, collaboratorFirstName: string): ActionDraft['owner'] {
  const o = normalize(owner ?? '');
  if (!o) return 'collaborateur';
  if (o.includes(normalize(collaboratorFirstName))) return 'collaborateur';
  if (o.includes(normalize(managerFirstName)) || /\b(moi|manager|je)\b/.test(o)) return 'manager';
  return 'collaborateur';
}

/** Transforme la réponse d'Echo en brouillons d'actions éditables. */
export function toDrafts(result: EchoResult, people: { manager: string; collaborator: string }, today: Date = new Date()): ActionDraft[] {
  return result.tasks
    .filter((t) => typeof t.title === 'string' && t.title.trim().length >= 3)
    .slice(0, 12)
    .map((t, i) => ({
      key: `${i}-${t.title}`,
      keep: true,
      title: t.title.trim().slice(0, 200),
      owner: guessOwner(t.owner, people.manager, people.collaborator),
      due: parseDue(t.due, today),
    }));
}

/** Vérifie la forme de la réponse d'Echo (donnée externe). */
export function readEchoResult(data: unknown): EchoResult | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as { summary?: unknown; tasks?: unknown };
  const tasks = Array.isArray(d.tasks)
    ? d.tasks.flatMap((t): EchoTask[] => {
        if (!t || typeof t !== 'object') return [];
        const x = t as Record<string, unknown>;
        if (typeof x.title !== 'string') return [];
        return [{ title: x.title, owner: typeof x.owner === 'string' ? x.owner : null, due: typeof x.due === 'string' ? x.due : null }];
      })
    : [];
  return { summary: typeof d.summary === 'string' ? d.summary : '', tasks };
}

/** Résumé d'Echo en lignes simples (retire le gras Markdown). */
export const summaryLines = (summary: string) =>
  summary
    .split('\n')
    .map((l) => l.replace(/^\s*(#+|[-*•])\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean);
