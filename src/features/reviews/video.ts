import { AppError, toUserMessage } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';

/** Accès à la salle de visio du 1 à 1 (Edge Function video-room, service Daily). */
export async function getVideoAccess(reviewId: string): Promise<{ url: string; token: string }> {
  const { data, error } = await supabase.functions.invoke<{
    url?: string;
    token?: string;
    error?: string;
  }>('video-room', {
    body: { review_id: reviewId },
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context
      ? ((await context.json().catch(() => null)) as { error?: string } | null)
      : null;
    throw new AppError(payload?.error ?? toUserMessage(error));
  }
  if (!data?.url || !data.token)
    throw new AppError(data?.error ?? 'Accès à la visio impossible. Réessayez.');
  return { url: data.url, token: data.token };
}
