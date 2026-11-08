import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';
import { localFetch, LOCAL_SUPABASE_URL } from '@/backend/local/fetch';
import { LOCAL_ANON_KEY } from '@/backend/local/jwt';
import type { Database } from '@/shared/types/database';

/** Abonnements push et préférences de notification : chacun ne voit et ne modifie que les siens. */
const PASSWORD = 'Cadence-Demo26!';
const client = () =>
  createClient<Database>(LOCAL_SUPABASE_URL, LOCAL_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: localFetch },
  });

let julien: SupabaseClient<Database>;
let manager: SupabaseClient<Database>;

beforeAll(async () => {
  julien = client();
  manager = client();
  await julien.auth.signInWithPassword({ email: 'julien.mercier@valmont-equipements.fr', password: PASSWORD });
  await manager.auth.signInWithPassword({ email: 'claire.vasseur@valmont-equipements.fr', password: PASSWORD });
}, 120_000);

describe('notifications', () => {
  it('enregistre un abonnement et des préférences pour soi', async () => {
    expect((await julien.from('push_subscriptions').upsert({ endpoint: 'https://push.example/abc', p256dh: 'k', auth: 'a' }, { onConflict: 'endpoint' })).error).toBeNull();
    expect((await julien.from('notification_prefs').upsert({ pulse_reminder: true, pulse_hour: 8, weekly_recap: false, request_alerts: true }, { onConflict: 'user_id' })).error).toBeNull();
    const { data } = await julien.from('notification_prefs').select('pulse_hour');
    expect(data).toEqual([{ pulse_hour: 8 }]);
  });

  it('le manager ne voit ni les abonnements ni les préférences des autres', async () => {
    expect((await manager.from('push_subscriptions').select('id')).data).toEqual([]);
    expect((await manager.from('notification_prefs').select('user_id')).data).toEqual([]);
  });

  it('refuse une heure de rappel hors plage', async () => {
    const { error } = await julien.from('notification_prefs').upsert({ pulse_hour: 3 }, { onConflict: 'user_id' });
    expect(error).not.toBeNull();
  });

  it('une demande de one-to-one reste créée même sans service d’envoi', async () => {
    const id = (await julien.auth.getUser()).data.user?.id ?? '';
    const { data, error } = await julien.from('review_requests').insert({ collaborator_id: id, message: 'Test notification' }).select('id').single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect((await julien.functions.invoke('push-notify', { body: { type: 'review_request', request_id: data?.id } })).error).toBeNull();
  });
});
