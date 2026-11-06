import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useReminders } from '../use-reminders';
import { cn } from '@/shared/lib/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/menu';

/** Cloche de l'en-tête : alertes (manager) ou rappels personnels (collaborateur). */
export function NotificationsMenu() {
  const { isManager } = useCurrentUser();
  const items = useReminders();
  const urgent = items.filter((i) => i.severity === 'danger').length;

  return (
    <Popover>
      <PopoverTrigger
        className="relative flex size-8 items-center justify-center rounded text-fg-muted hover:bg-surface-muted hover:text-fg"
        aria-label={`Notifications : ${items.length}`}
      >
        <Bell className="size-4" aria-hidden />
        {items.length > 0 && (
          <span
            className={cn(
              'tabular absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-xs font-medium leading-none',
              urgent ? 'bg-danger text-fg-inverse' : 'bg-accent text-accent-fg',
            )}
          >
            {items.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-90 p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <span className="text-base font-semibold">{isManager ? 'Alertes' : 'Rappels'}</span>
          {isManager && (
            <Link to="/alertes" className="text-sm text-accent hover:underline">
              Tout voir
            </Link>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-muted">Rien à signaler pour le moment.</p>
        ) : (
          <ul className="max-h-100 divide-y divide-line overflow-y-auto">
            {items.slice(0, 8).map((item) => (
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
