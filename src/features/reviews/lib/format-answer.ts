import type { Question } from '../api';
import type { AnswerValue } from './review-rules';

/** Affichage en lecture d'une réponse. */
export function formatAnswer(type: Question['type'], value: AnswerValue | undefined): string {
  if (value === undefined || value === null || value === '') return '—';
  if (type === 'echelle') return `${value} / 5`;
  if (type === 'oui_non') return value ? 'Oui' : 'Non';
  return String(value);
}
