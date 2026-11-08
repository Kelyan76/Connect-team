import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useWrite } from '@/shared/lib/crud';
import { check, unwrap } from '@/shared/lib/errors';
import { qk } from '@/shared/lib/query-keys';
import { supabase } from '@/shared/lib/supabase';
import type { Tables } from '@/shared/types/database';
import { canInstall, currentSubscription, disablePush, enablePush, onInstallChange, pushSupported } from './push';

export type NotificationPrefs = Pick<Tables<'notification_prefs'>, 'pulse_reminder' | 'pulse_hour' | 'weekly_recap' | 'request_alerts'>;
export const DEFAULT_PREFS: NotificationPrefs = { pulse_reminder: true, pulse_hour: 9, weekly_recap: true, request_alerts: true };

export function useNotificationPrefs() {
  return useQuery({
    queryKey: qk.notificationPrefs,
    queryFn: async (): Promise<NotificationPrefs> => {
      const rows = unwrap(await supabase.from('notification_prefs').select('pulse_reminder, pulse_hour, weekly_recap, request_alerts'), 'Préférences');
      return rows[0] ?? DEFAULT_PREFS;
    },
  });
}

export const useSavePrefs = () =>
  useWrite(
    async (prefs: NotificationPrefs) => check(await supabase.from('notification_prefs').upsert(prefs, { onConflict: 'user_id' }), 'Préférences'),
    [qk.notificationPrefs],
    'Préférences enregistrées',
  );

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

/** État des notifications sur cet appareil, avec activation / désactivation. */
export function usePushState() {
  const qc = useQueryClient();
  const [state, setState] = useState<PushState>(pushSupported() ? 'off' : 'unsupported');
  const refresh = useCallback(async () => {
    if (!pushSupported()) return setState('unsupported');
    if (Notification.permission === 'denied') return setState('denied');
    setState((await currentSubscription()) ? 'on' : 'off');
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = async () => {
    await enablePush();
    await refresh();
    await qc.invalidateQueries({ queryKey: qk.notificationPrefs });
  };
  const disable = async () => {
    await disablePush();
    await refresh();
  };
  return { state, enable, disable };
}

/** L'application peut-elle être installée (invite du navigateur disponible) ? */
export function useCanInstall(): boolean {
  return useSyncExternalStore(onInstallChange, canInstall, () => false);
}
