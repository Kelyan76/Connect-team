import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { localFetch, LOCAL_SUPABASE_URL } from '@/backend/local/fetch';
import { LOCAL_ANON_KEY } from '@/backend/local/jwt';
import type { Database } from '@/shared/types/database';

/** Récap vocal : réservé au manager de l'entretien (équivalent local de l'Edge Function review-recap). */
const PASSWORD = 'Cadence-Demo26!';
const client = () =>
  createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });
const TRANSCRIPT = 'On a parlé des astreintes de décembre. Julien est fatigué. On décide de faire un roulement avec Bastien.';

let manager: SupabaseClient<Database>;
let julien: SupabaseClient<Database>;
let reviewId = '';

beforeAll(async () => {
  manager = client();
  julien = client();
  await manager.auth.signInWithPassword({ email: 'claire.vasseur@valmont-equipements.fr', password: PASSWORD });
  await julien.auth.signInWithPassword({ email: 'julien.mercier@valmont-equipements.fr', password: PASSWORD });
  reviewId = (await manager.from('reviews').select('id').eq('status', 'planifie').limit(1).single()).data?.id ?? '';
}, 120_000);

describe('récap vocal', () => {
  it('le manager obtient un récap structuré', async () => {
    const { data, error } = await manager.functions.invoke('review-recap', { body: { review_id: reviewId, transcript: TRANSCRIPT } });
    expect(error).toBeNull();
    expect(data.recap.points.length).toBeGreaterThan(0);
  });

  it('un collaborateur ne peut pas générer de récap', async () => {
    const { error } = await julien.functions.invoke('review-recap', { body: { review_id: reviewId, transcript: TRANSCRIPT } });
    expect(error).not.toBeNull();
  });

  it('refuse une transcription trop courte', async () => {
    const { error } = await manager.functions.invoke('review-recap', { body: { review_id: reviewId, transcript: 'Bonjour.' } });
    expect(error).not.toBeNull();
  });
});
