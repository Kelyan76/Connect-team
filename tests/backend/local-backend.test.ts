import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { localFetch, LOCAL_SUPABASE_URL } from '@/backend/local/fetch';
import { LOCAL_ANON_KEY } from '@/backend/local/jwt';
import { mailbox } from '@/backend/local/mailbox';
import type { Database } from '@/shared/types/database';

/**
 * Intégration : le vrai client supabase-js parle au backend embarqué (Auth, REST, RPC, Functions)
 * au-dessus de PostgreSQL. Garantit que la démonstration se comporte comme Supabase.
 */
const PASSWORD = 'Cadence-Demo26!';
const client = () =>
  createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });

let manager: SupabaseClient<Database>;
let julien: SupabaseClient<Database>;

beforeAll(async () => {
  manager = client();
  julien = client();
  expect((await manager.auth.signInWithPassword({ email: 'camille.lefevre@nebuleo.example', password: PASSWORD })).error).toBeNull();
  expect((await julien.auth.signInWithPassword({ email: 'hugo.lambert@nebuleo.example', password: PASSWORD })).error).toBeNull();
}, 120_000);

describe('authentification', () => {
  it('refuse un mauvais mot de passe', async () => {
    const { error } = await client().auth.signInWithPassword({ email: 'hugo.lambert@nebuleo.example', password: 'mauvais' });
    expect(error?.message).toMatch(/invalid login credentials/i);
  });

  it('impose les règles de mot de passe', async () => {
    const { error } = await julien.auth.updateUser({ password: 'trop-court' });
    expect(error).not.toBeNull();
  });

  it('envoie un lien de réinitialisation dans la boîte locale', async () => {
    await client().auth.resetPasswordForEmail('ines.moreau@nebuleo.example');
    expect(mailbox.list()[0]?.to).toBe('ines.moreau@nebuleo.example');
  });
});

describe('lecture et écriture via PostgREST', () => {
  it('filtre, trie et limite', async () => {
    const { data, error } = await manager.from('tasks').select('id,title,due_date').eq('status', 'a_faire').order('due_date').limit(3);
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    expect((data?.[0]?.due_date ?? '') <= (data?.[1]?.due_date ?? '')).toBe(true);
  });

  it('met à jour une tâche (manager) et renvoie la ligne', async () => {
    const task = (await manager.from('tasks').select('id').eq('status', 'a_faire').limit(1).single()).data;
    const { data, error } = await manager.from('tasks').update({ status: 'en_cours', position: 99 }).eq('id', task?.id ?? '').select().single();
    expect(error).toBeNull();
    expect(data?.status).toBe('en_cours');
  });

  it('insère puis supprime un feedback', async () => {
    const julienId = (await julien.auth.getUser()).data.user?.id ?? '';
    const { data, error } = await manager.from('feedbacks').insert({ collaborator_id: julienId, kind: 'point_fort', body: 'Test d’intégration', is_shared: false }).select('id').single();
    expect(error).toBeNull();
    expect((await manager.from('feedbacks').delete().eq('id', data?.id ?? '')).error).toBeNull();
  });

  it('upsert sur clé composite (météo)', async () => {
    const id = (await julien.auth.getUser()).data.user?.id ?? '';
    const week = '2026-01-05';
    expect((await julien.from('weather_entries').upsert({ collaborator_id: id, week_start: week, mood: 3, workload: 3, comment: '' }, { onConflict: 'collaborator_id,week_start' })).error).toBeNull();
    expect((await julien.from('weather_entries').upsert({ collaborator_id: id, week_start: week, mood: 5, workload: 2, comment: '' }, { onConflict: 'collaborator_id,week_start' })).error).toBeNull();
    const { data } = await julien.from('weather_entries').select('mood').eq('week_start', week).single();
    expect(data?.mood).toBe(5);
  });

  it('applique la RLS : un collaborateur ne voit pas les notes privées', async () => {
    const { data } = await julien.from('manager_notes').select('*');
    expect(data).toEqual([]);
  });

  it('refuse une écriture interdite avec un message exploitable', async () => {
    const { error } = await julien.from('manager_notes').insert({ collaborator_id: 'x', body: 'non' });
    expect(error).not.toBeNull();
  });

  it('appelle une fonction RPC', async () => {
    const { error } = await julien.rpc('record_login', { p_user_agent: 'vitest' });
    expect(error).toBeNull();
  });
});

describe('Edge Functions locales', () => {
  it('le manager invite un collaborateur, qui reçoit un e-mail', async () => {
    const { error } = await manager.functions.invoke('invite-member', {
      body: { email: 'lea.martin@nebuleo.example', first_name: 'Léa', last_name: 'Martin', job_title: 'Dessinatrice projeteuse', hired_on: '2026-11-16' },
    });
    expect(error).toBeNull();
    expect(mailbox.list()[0]?.subject).toMatch(/invité/);
    const { data } = await manager.from('profiles').select('first_name').eq('email', 'lea.martin@nebuleo.example').single();
    expect(data?.first_name).toBe('Léa');
  });

  it('un collaborateur ne peut pas inviter', async () => {
    const { error } = await julien.functions.invoke('invite-member', { body: { email: 'x@y.fr', first_name: 'X', last_name: 'Y', job_title: 'Test' } });
    expect(error).not.toBeNull();
  });
});
