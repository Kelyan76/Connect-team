/**
 * Objectif SMART : Spécifique, Mesurable, Atteignable, Réaliste, Temporel.
 * « L'objectif porte sur le résultat attendu, pas seulement sur l'action » (cours, les 10 minutes de l'engagement).
 */

export type SmartLetter = 'S' | 'M' | 'A' | 'R' | 'T';

export interface SmartInput {
  title: string;
  description: string;
  keyResults: number;
  means: string;
  agreed: boolean;
  startDate: string;
  dueDate: string;
}

export interface SmartCriterion {
  letter: SmartLetter;
  label: string;
  ok: boolean;
  hint: string;
}

const VAGUE = /\b(améliorer|mieux|davantage|optimiser|essayer|progresser|travailler sur)\b/i;

export function smartCheck(o: SmartInput): SmartCriterion[] {
  const text = `${o.title} ${o.description}`.trim();
  const specific = o.title.trim().length >= 8 && (o.description.trim().length >= 20 || !VAGUE.test(o.title));
  const days = o.startDate && o.dueDate ? (Date.parse(o.dueDate) - Date.parse(o.startDate)) / 86_400_000 : NaN;
  return [
    {
      letter: 'S',
      label: 'Spécifique',
      ok: specific,
      hint: specific ? 'Le résultat attendu est décrit.' : 'Précisez le résultat attendu (quoi, pour qui), pas seulement l’intention.',
    },
    {
      letter: 'M',
      label: 'Mesurable',
      ok: o.keyResults > 0 || /\d/.test(text),
      hint: o.keyResults > 0 ? 'Mesuré par au moins un résultat clé.' : 'Ajoutez un résultat clé chiffré (valeur de départ et cible).',
    },
    {
      letter: 'A',
      label: 'Atteignable',
      ok: o.agreed,
      hint: o.agreed ? 'Discuté et accepté par le collaborateur.' : 'Validez-le avec le collaborateur : il doit y croire.',
    },
    {
      letter: 'R',
      label: 'Réaliste',
      ok: o.means.trim().length >= 5,
      hint: o.means.trim().length >= 5 ? 'Moyens fournis par le manager précisés.' : '« De quoi as-tu besoin de moi ? » Notez les moyens que vous apportez.',
    },
    {
      letter: 'T',
      label: 'Temporel',
      ok: Number.isFinite(days) && days >= 1,
      hint: Number.isFinite(days) && days >= 1 ? 'Échéance fixée.' : 'Fixez une échéance après la date de début.',
    },
  ];
}

export const smartScore = (criteria: SmartCriterion[]) => criteria.filter((c) => c.ok).length;
