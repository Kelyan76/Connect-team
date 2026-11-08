import { AppError } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';

/** Récap d'entretien produit par l'Edge Function review-recap (format imposé côté serveur). */
export interface ReviewRecap {
  synthese: string;
  points: string[];
  decisions: string[];
  actions: { titre: string; responsable: 'manager' | 'collaborateur'; echeance: string | null }[];
  vigilance: string[];
}

export async function generateRecap(reviewId: string, transcript: string): Promise<{ recap: ReviewRecap; demo: boolean }> {
  const { data, error } = await supabase.functions.invoke<{ recap?: ReviewRecap; demo?: boolean; error?: string }>('review-recap', {
    body: { review_id: reviewId, transcript },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context ? ((await context.json().catch(() => null)) as { error?: string } | null) : null;
    throw new AppError(payload?.error ?? 'Le récap n’a pas pu être généré.');
  }
  if (!data?.recap) throw new AppError(data?.error ?? 'Le récap n’a pas pu être généré.');
  return { recap: data.recap, demo: !!data.demo };
}

const list = (title: string, items: string[]) => (items.length ? `${title}\n${items.map((i) => `- ${i}`).join('\n')}` : '');

/** Texte ajouté aux notes de l'entretien (la synthèse va dans le champ dédié). */
export function recapToNotes(r: ReviewRecap, formatDate: (iso: string) => string): string {
  const actions = r.actions.map(
    (a) => `${a.titre} (${a.responsable === 'manager' ? 'manager' : 'collaborateur'}${a.echeance ? `, pour le ${formatDate(a.echeance)}` : ''})`,
  );
  return [
    '── Récap de l’enregistrement ──',
    list('Points abordés', r.points),
    list('Décisions', r.decisions),
    list('Actions', actions),
    list('À suivre (manager)', r.vigilance),
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ─── Reconnaissance vocale du navigateur (Web Speech API) ──────────────────
// Typage minimal : l'API n'est pas dans les définitions DOM de TypeScript.
export interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
