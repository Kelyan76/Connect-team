import { askAiChat } from '@/features/ai/client';
import { assistantContext } from '@/features/ai/lib/assistant';
import { parseWeekly, weeklyPrompt, type WeeklyDigest } from '@/features/ai/lib/weekly';
import { AppError, check, unwrap } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import type { Json } from '@/shared/types/database';

export interface StoredDigest {
  digest: WeeklyDigest;
  createdAt: string;
}

/** Résumé de la semaine déjà rédigé pour l'équipe (null s'il n'existe pas encore). */
export async function getWeeklyDigest(
  teamId: string,
  weekStart: string,
): Promise<StoredDigest | null> {
  // Liste (0 ou 1 ligne) : « pas encore rédigé » n'est pas une erreur.
  const [row] = unwrap(
    await supabase
      .from('weekly_digests')
      .select('content, created_at')
      .eq('team_id', teamId)
      .eq('week_start', weekStart)
      .limit(1),
    'Résumé de la semaine',
  );
  const digest = row ? parseWeekly(row.content) : null;
  return row && digest ? { digest, createdAt: row.created_at } : null;
}

/** Demande les 5 lignes à l'IA (Echo) puis les garde en base pour toute la semaine. */
export async function generateWeeklyDigest(input: {
  teamId: string;
  weekStart: string;
  weekLabel: string;
  managerFirstName: string;
  data: string;
}): Promise<StoredDigest> {
  const reply = await askAiChat(assistantContext('manager', input.managerFirstName, input.data), [
    { role: 'user', content: weeklyPrompt(input.managerFirstName, input.weekLabel) },
  ]);
  const digest = parseWeekly(reply);
  if (!digest)
    throw new AppError('Le résumé de l’IA est inexploitable. Réessayez dans un instant.');
  check(
    await supabase
      .from('weekly_digests')
      .upsert(
        { team_id: input.teamId, week_start: input.weekStart, content: digest as unknown as Json },
        { onConflict: 'team_id,week_start' },
      ),
    'Résumé de la semaine',
  );
  return { digest, createdAt: new Date().toISOString() };
}
