import { AI_CONTEXT } from './lib/ai';

/**
 * Appel à l'IA servie par Echo (relais /api/echo-chat : Vite en local, réécriture Vercel en ligne).
 * Gratuit dans le quota de l'application Echo ; si elle est indisponible, l'erreur est affichée et le formulaire reste utilisable.
 */
export async function askAi(prompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch('/api/echo-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: AI_CONTEXT,
        summary: '',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch {
    throw new Error('L’assistant IA est injoignable. Vérifiez la connexion et réessayez.');
  }
  const data: unknown = await res.json().catch(() => null);
  const reply =
    data && typeof data === 'object' && 'reply' in data && typeof data.reply === 'string'
      ? data.reply
      : null;
  if (!res.ok || !reply)
    throw new Error('L’assistant IA n’a pas pu répondre. Réessayez dans un instant.');
  return reply;
}

/** Appel + lecture d'une réponse structurée ; erreur claire si la réponse est inexploitable. */
export async function askAiFor<T>(prompt: string, parse: (reply: string) => T | null): Promise<T> {
  const value = parse(await askAi(prompt));
  if (value === null) throw new Error('Réponse de l’IA inexploitable. Réessayez.');
  return value;
}
