/**
 * Dictée pendant l'entretien : reconnaissance vocale intégrée au navigateur (Web Speech API), gratuite.
 * Aucun son n'est enregistré ; seul le texte reconnu est utilisé.
 */
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
