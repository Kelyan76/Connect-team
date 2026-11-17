import { readEchoResult, type EchoResult } from './lib/echo';

/** Durée maximale d'un enregistrement envoyé à Echo. */
export const ECHO_MAX_SECONDS = 10 * 60;

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = String(reader.result);
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = () => reject(new Error('Lecture de l’enregistrement impossible.'));
    reader.readAsDataURL(blob);
  });

/**
 * Envoie l'enregistrement à Echo (application de prise de parole du groupe) qui transcrit
 * et extrait résumé et tâches. L'audio n'est pas conservé par Connect Team.
 */
export async function transcribeWithEcho(audio: Blob): Promise<EchoResult> {
  if (audio.size < 2000) throw new Error('Enregistrement trop court : parlez quelques secondes.');
  let res: Response;
  try {
    res = await fetch('/api/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: await toBase64(audio),
        mimeType: audio.type.split(';')[0] || 'audio/webm',
      }),
    });
  } catch {
    throw new Error('Echo est injoignable. Vérifiez la connexion et réessayez.');
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : null;
    throw new Error(message ?? 'Echo n’a pas pu analyser l’enregistrement. Réessayez.');
  }
  const result = readEchoResult(data);
  if (!result) throw new Error('Réponse d’Echo illisible. Réessayez.');
  return result;
}
