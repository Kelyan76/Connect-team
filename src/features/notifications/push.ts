import { AppError, check } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import { VAPID_PUBLIC_KEY } from './config';

/** Notifications Web Push : abonnement de l'appareil courant, enregistré dans push_subscriptions. */

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Application ouverte depuis l'écran d'accueil (indispensable sur iPhone pour les notifications). */
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.error('Service worker', e);
  }
}

function keyBytes(base64url: string): Uint8Array {
  const padded = `${base64url}${'='.repeat((4 - (base64url.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Demande l'autorisation, abonne l'appareil et l'enregistre pour l'utilisateur connecté. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new AppError('Ce navigateur ne gère pas les notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new AppError('Notifications refusées : autorisez-les dans les réglages du navigateur.');
  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) as BufferSource }));
  const json = sub.toJSON();
  check(
    await supabase.from('push_subscriptions').upsert(
      {
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        user_agent: navigator.userAgent.slice(0, 400),
      },
      { onConflict: 'endpoint' },
    ),
    'Notifications',
  );
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  check(await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint), 'Notifications');
  await sub.unsubscribe();
}

/** Notification de test sur ses propres appareils. */
export async function sendTestPush(): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ sent?: number; error?: string }>('push-notify', { body: { type: 'test' } });
  if (error) {
    const context = (error as { context?: Response }).context;
    const payload = context ? ((await context.json().catch(() => null)) as { error?: string } | null) : null;
    throw new AppError(payload?.error ?? 'La notification de test n’a pas pu être envoyée.');
  }
  return data?.sent ?? 0;
}

/** Prévient le manager d'une nouvelle demande de one-to-one (sans bloquer si l'envoi échoue). */
export function notifyReviewRequest(requestId: string): void {
  void supabase.functions.invoke('push-notify', { body: { type: 'review_request', request_id: requestId } }).catch(() => undefined);
}

// ─── Installation de l'application (Android, Chrome, Edge) ───────────────
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredInstall: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredInstall = null;
    installListeners.forEach((l) => l());
  });
}

export const canInstall = () => deferredInstall !== null;
export const onInstallChange = (l: () => void) => {
  installListeners.add(l);
  return () => installListeners.delete(l);
};

export async function promptInstall(): Promise<void> {
  if (!deferredInstall) return;
  await deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  installListeners.forEach((l) => l());
}
