import { BellRing, Download, Loader2, Send, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { toUserMessage } from '@/shared/lib/errors';
import { isLocalBackend } from '@/shared/lib/supabase';
import { Button } from '@/shared/ui/button';
import { NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';
import { Switch } from '@/shared/ui/toggle';
import { isIos, isStandalone, promptInstall, sendTestPush } from '../push';
import { DEFAULT_PREFS, useCanInstall, useNotificationPrefs, usePushState, useSavePrefs, type NotificationPrefs } from '../queries';

function Row({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-medium">{title}</span>
        <span className="text-sm text-fg-subtle">{detail}</span>
      </div>
      {children}
    </div>
  );
}

/** Réglages : notifications sur cet appareil, rappels et récap, installation de l'application. */
export function NotificationSettings() {
  const { isManager } = useCurrentUser();
  const push = usePushState();
  const prefs = useNotificationPrefs();
  const save = useSavePrefs();
  const installable = useCanInstall();
  const [busy, setBusy] = useState<'on' | 'off' | 'test' | null>(null);
  const p = prefs.data ?? DEFAULT_PREFS;
  const set = (patch: Partial<NotificationPrefs>) => save.mutate({ ...p, ...patch });

  const run = async (kind: 'on' | 'off' | 'test') => {
    setBusy(kind);
    try {
      if (kind === 'on') {
        await push.enable();
        toast.success('Notifications activées sur cet appareil');
      } else if (kind === 'off') {
        await push.disable();
        toast('Notifications désactivées sur cet appareil');
      } else {
        const sent = await sendTestPush();
        toast.success(sent ? 'Notification envoyée' : 'Aucun appareil abonné pour le moment');
      }
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const iosNeedsInstall = isIos() && !isStandalone();

  return (
    <Panel title="Notifications et rappels" description="Pour ne rien oublier, sans avoir à ouvrir l’application.">
      <div className="flex flex-col divide-y divide-line">
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <span
            className={cn(
              'flex size-10 items-center justify-center rounded',
              push.state === 'on' ? 'bg-success-subtle text-success' : 'bg-accent-subtle text-accent',
            )}
          >
            <BellRing className="size-5" aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-medium">
              {push.state === 'on'
                ? 'Activées sur cet appareil'
                : push.state === 'denied'
                  ? 'Bloquées par le navigateur'
                  : push.state === 'unsupported'
                    ? iosNeedsInstall
                      ? 'Installez d’abord l’application'
                      : 'Non disponibles sur ce navigateur'
                    : 'Désactivées sur cet appareil'}
            </span>
            <span className="text-sm text-fg-subtle">
              {push.state === 'denied'
                ? 'Autorisez les notifications pour ce site dans les réglages du navigateur.'
                : iosNeedsInstall
                  ? 'Sur iPhone : bouton Partager, puis « Sur l’écran d’accueil », et ouvrez Connect Team depuis son icône.'
                  : isLocalBackend
                    ? 'Démonstration locale : l’envoi réel fonctionne sur la version en ligne.'
                    : 'Activez-les sur chaque appareil où vous voulez être prévenu.'}
            </span>
          </div>
          {push.state === 'off' && (
            <Button variant="primary" disabled={busy !== null} onClick={() => void run('on')}>
              {busy === 'on' ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />}
              Activer
            </Button>
          )}
          {push.state === 'on' && (
            <div className="flex gap-2">
              <Button disabled={busy !== null} onClick={() => void run('test')}>
                {busy === 'test' ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                Tester
              </Button>
              <Button variant="ghost" disabled={busy !== null} onClick={() => void run('off')}>
                Désactiver
              </Button>
            </div>
          )}
        </div>

        {!isManager && (
          <Row title="Rappel du pouls du jour" detail="Les jours ouvrés, si vous ne l’avez pas encore donné.">
            <div className="flex items-center gap-2">
              <NativeSelect
                aria-label="Heure du rappel"
                className="w-24"
                value={p.pulse_hour}
                disabled={!p.pulse_reminder}
                onChange={(e) => set({ pulse_hour: Number(e.target.value) })}
              >
                {[7, 8, 9, 10, 11, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} h
                  </option>
                ))}
              </NativeSelect>
              <Switch checked={p.pulse_reminder} onCheckedChange={(v) => set({ pulse_reminder: v })} aria-label="Rappel du pouls du jour" />
            </div>
          </Row>
        )}

        {isManager && (
          <>
            <Row title="Récap du lundi" detail="Moral bas, surcharge, demandes, entretiens et retards de la semaine.">
              <div className="flex items-center gap-2">
                <NativeSelect
                  aria-label="Heure du récap"
                  className="w-24"
                  value={p.pulse_hour}
                  disabled={!p.weekly_recap}
                  onChange={(e) => set({ pulse_hour: Number(e.target.value) })}
                >
                  {[7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>
                      {h} h
                    </option>
                  ))}
                </NativeSelect>
                <Switch checked={p.weekly_recap} onCheckedChange={(v) => set({ weekly_recap: v })} aria-label="Récap du lundi" />
              </div>
            </Row>
            <Row title="Demandes de one-to-one" detail="Dès qu’un collaborateur vous en demande un.">
              <Switch checked={p.request_alerts} onCheckedChange={(v) => set({ request_alerts: v })} aria-label="Demandes de one-to-one" />
            </Row>
          </>
        )}

        {(installable || iosNeedsInstall) && (
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <Smartphone className="size-5 text-fg-subtle" aria-hidden />
            <span className="min-w-0 flex-1 text-sm text-fg-muted">Ajoutez Connect Team à votre écran d’accueil, comme une vraie application.</span>
            {installable && (
              <Button onClick={() => void promptInstall()}>
                <Download aria-hidden />
                Installer l’application
              </Button>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
