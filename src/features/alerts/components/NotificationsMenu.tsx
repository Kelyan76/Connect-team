import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useReviewRequests } from '@/features/reviews/queries';
import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/menu';
import { toast } from '@/shared/ui/toaster';
import { useReminders } from '../use-reminders';

/**
 * Le manager est prévenu dès qu'un collaborateur demande un 1 à 1 : notification à l'écran
 * et cloche qui s'anime (les demandes sont relues toutes les 30 s).
 */
function useNewRequestNotifier(enabled: boolean, onNew: () => void) {
  const requests = useReviewRequests();
  const team = useTeamMembers();
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!enabled || !requests.data) return;
    const pending = requests.data.filter((r) => r.status === 'en_attente');
    if (seen.current === null) {
      seen.current = new Set(pending.map((r) => r.id));
      return;
    }
    const fresh = pending.filter((r) => !seen.current?.has(r.id));
    for (const r of fresh) {
      seen.current.add(r.id);
      const who = team.byId.get(r.collaborator_id);
      toast(`${who ? fullName(who) : 'Un collaborateur'} demande un 1 à 1`, {
        description: r.message || undefined,
        action: { label: 'Voir', onClick: () => navigate('/entretiens') },
        duration: 10_000,
      });
    }
    if (fresh.length) onNew();
  }, [enabled, requests.data, team.byId, navigate, onNew]);
}

/** Cloche de l'en-tête : demandes, signaux et alertes (manager) ou rappels personnels (collaborateur). */
export function NotificationsMenu() {
  const { isManager } = useCurrentUser();
  const items = useReminders();
  const urgent = items.filter((i) => i.severity === 'danger').length;
  const [ring, setRing] = useState(0);
  const onNew = useRef(() => setRing((n) => n + 1)).current;
  useNewRequestNotifier(isManager, onNew);

  return (
    <Popover>
      <PopoverTrigger
        className="relative flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted hover:text-fg"
        aria-label={`Notifications : ${items.length}`}
      >
        <Bell key={ring} className={cn('size-5', ring > 0 && 'animate-wiggle')} aria-hidden />
        {items.length > 0 && (
          <span
            className={cn(
              'tabular absolute right-0 top-0 flex h-4 min-w-4 animate-pop-in items-center justify-center rounded-full px-1 text-xs font-medium leading-none',
              urgent ? 'bg-danger text-fg-inverse' : 'bg-accent text-accent-fg',
            )}
          >
            {items.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(22.5rem,calc(100vw-24px))] p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-base font-semibold">{isManager ? 'Notifications' : 'Rappels'}</span>
          {isManager && (
            <Link to="/alertes" className="text-sm font-medium text-accent hover:underline">
              Tout voir
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-muted">Rien à signaler pour le moment.</p>
        ) : (
          <ul className="stagger max-h-100 divide-y divide-line overflow-y-auto">
            {items.slice(0, 10).map((item) => (
              <li key={item.id}>
                <Link to={item.to} className="flex gap-3 px-4 py-3 hover:bg-surface-muted/60">
                  <span className={cn('mt-2 size-2 shrink-0 rounded-full', item.severity === 'danger' ? 'bg-danger' : 'bg-warning')} aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium text-fg">{item.title}</span>
                    <span className="text-xs text-fg-subtle">{item.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
