import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { localFetch, LOCAL_SUPABASE_URL } from '@/backend/local/fetch';
import { LOCAL_ANON_KEY } from '@/backend/local/jwt';
import type { Database } from '@/shared/types/database';

/** Pouls du jour : saisie par le collaborateur, lecture par son manager uniquement. */
const PASSWORD = 'Cadence-Demo26!';
const client = () =>
  createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });

let manager: SupabaseClient<Database>;
let julien: SupabaseClient<Database>;
let nadia: SupabaseClient<Database>;
let julienId = '';

beforeAll(async () => {
  manager = client();
  julien = client();
  nadia = client();
  await manager.auth.signInWithPassword({ email: 'claire.vasseur@valmont-equipements.fr', password: PASSWORD });
  await julien.auth.signInWithPassword({ email: 'julien.mercier@valmont-equipements.fr', password: PASSWORD });
  await nadia.auth.signInWithPassword({ email: 'nadia.haddad@valmont-equipements.fr', password: PASSWORD });
  julienId = (await julien.auth.getUser()).data.user?.id ?? '';
}, 120_000);

describe('pouls du jour', () => {
  it('le jeu de démonstration contient un historique', async () => {
    const { data } = await manager.from('daily_pulses').select('id');
    expect((data ?? []).length).toBeGreaterThan(50);
  });

  it('le collaborateur saisit puis corrige son pouls du jour (une seule ligne)', async () => {
    expect((await julien.from('daily_pulses').upsert({ collaborator_id: julienId, mood: 2, energy: 3, note: 'test' }, { onConflict: 'collaborator_id,day' })).error).toBeNull();
    expect((await julien.from('daily_pulses').upsert({ collaborator_id: julienId, mood: 4, energy: 4, note: '' }, { onConflict: 'collaborator_id,day' })).error).toBeNull();
    const { data } = await manager.from('daily_pulses').select('mood, day').eq('collaborator_id', julienId).order('day', { ascending: false }).limit(1);
    expect(data?.[0]?.mood).toBe(4);
  });

  it('un collaborateur ne voit pas le pouls des autres', async () => {
    const { data } = await nadia.from('daily_pulses').select('collaborator_id');
    const ids = new Set((data ?? []).map((d) => d.collaborator_id));
    expect(ids.has(julienId)).toBe(false);
  });

  it('impossible de saisir pour un autre jour ou un autre collaborateur', async () => {
    expect((await nadia.from('daily_pulses').insert({ collaborator_id: julienId, mood: 5, energy: 5 })).error).not.toBeNull();
    expect((await julien.from('daily_pulses').insert({ collaborator_id: julienId, day: '2020-01-06', mood: 5, energy: 5 })).error).not.toBeNull();
  });
});
