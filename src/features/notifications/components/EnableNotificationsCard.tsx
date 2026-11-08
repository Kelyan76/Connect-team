import { BellRing, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { toUserMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toaster';
import { isIos, isStandalone } from '../push';
import { usePushState } from '../queries';

const KEY = 'cadence.notifications.invite-dismissed';

function dismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Invitation sur l'accueil à activer les notifications sur cet appareil
 * (ou, sur iPhone, à installer l'application d'abord). Masquable définitivement.
 */
export function EnableNotificationsCard() {
  const { isManager } = useCurrentUser();
  const push = usePushState();
  const [hidden, setHidden] = useState(dismissed);
  const [busy, setBusy] = useState(false);
  const iosNeedsInstall = isIos() && !isStandalone();

  if (hidden || push.state === 'on' || push.state === 'denied' || (push.state === 'unsupported' && !iosNeedsInstall)) return null;

  const hide = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // stockage indisponible : masqué pour cette visite seulement
    }
    setHidden(true);
  };

  const enable = async () => {
    setBusy(true);
    try {
      await push.enable();
      toast.success('C’est activé : vous serez prévenu ici');
    } catch (e) {
      toast.error(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative mb-6 flex animate-page-in flex-wrap items-center gap-3 overflow-hidden rounded-lg border border-accent/20 bg-gradient-to-r from-accent-subtle to-surface p-4 shadow-sm">
      <span className="flex size-10 shrink-0 items-center justify-center rounded bg-gradient-to-br from-hero-from to-hero-to text-white shadow-sm">
        <BellRing className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium">{isManager ? 'Soyez prévenu, sans ouvrir l’application' : 'Un petit rappel chaque matin ?'}</span>
        <span className="text-sm text-fg-muted">
          {iosNeedsInstall
            ? 'Sur iPhone : Partager › « Sur l’écran d’accueil », puis ouvrez Connect Team depuis son icône.'
            : isManager
              ? 'Demandes de one-to-one en direct et récap de l’équipe chaque lundi.'
              : 'Une notification pour votre pouls du jour, seulement si vous l’avez oublié.'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {iosNeedsInstall ? (
          <Button asChild size="sm">
            <Link to="/profil">En savoir plus</Link>
          </Button>
        ) : (
          <Button size="sm" variant="primary" disabled={busy} onClick={() => void enable()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <BellRing aria-hidden />}
            Activer
          </Button>
        )}
        <Button size="icon-sm" variant="ghost" aria-label="Masquer" onClick={hide}>
          <X aria-hidden />
        </Button>
      </div>
    </section>
  );
}
