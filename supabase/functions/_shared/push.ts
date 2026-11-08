// Envoi Web Push (Deno) : clés VAPID dans les secrets des Edge Functions.
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY : paire générée une fois ; VAPID_SUBJECT : adresse du site.
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface PushPayload {
  title: string;
  body: string;
  /** Page ouverte au clic. */
  url: string;
  /** Une notification du même tag remplace la précédente. */
  tag: string;
}

let configured = false;
export function pushReady(): boolean {
  if (configured) return true;
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) return false;
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://connect-team-app.vercel.app', pub, priv);
  configured = true;
  return true;
}

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envoie à tous les appareils de ces utilisateurs ; supprime les abonnements expirés (404/410). */
export async function sendToUsers(admin: SupabaseClient, userIds: string[], payload: PushPayload): Promise<number> {
  if (!userIds.length || !pushReady()) return 0;
  const { data } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('user_id', userIds);
  let sent = 0;
  for (const s of (data ?? []) as Subscription[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600 });
      sent += 1;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push', status, e);
    }
  }
  return sent;
}

export function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    const first = Object.values(keys)[0];
    if (first) return first;
  } catch {
    // variable absente ou mal formée : repli ci-dessous
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}
