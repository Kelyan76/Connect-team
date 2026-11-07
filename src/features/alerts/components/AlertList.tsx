import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Badge } from '@/shared/ui/badge';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { ALERT_KIND_LABEL, type Alert } from '../lib/alerts';

/** Liste d'alertes : liseré de sévérité, titre, détail, lien vers l'écran concerné. */
export function AlertList({ alerts, limit, compact = false }: { alerts: Alert[] | undefined; limit?: number; compact?: boolean }) {
  if (!alerts) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }
  if (alerts.length === 0) {
    return <EmptyState title="Aucune alerte" description="Objectifs, charge, pouls et entretiens sont dans les seuils fixés." />;
  }
  return (
    <ul className="divide-y divide-line">
      {alerts.slice(0, limit).map((a) => (
        <li key={a.id}>
          <Link to={a.to} className="group flex items-start gap-3 px-4 py-3 hover:bg-surface-muted/50">
            <span className={cn('mt-1 h-8 w-0.5 shrink-0 rounded-full', a.severity === 'danger' ? 'bg-danger' : 'bg-warning')} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={cn('text-sm font-medium text-fg', compact && 'line-clamp-2')}>{a.title}</span>
              <span className="flex flex-wrap items-center gap-2 text-xs text-fg-subtle">
                {!compact && <Badge tone="outline">{ALERT_KIND_LABEL[a.kind]}</Badge>}
                {a.detail}
              </span>
            </span>
            <ChevronRight className="mt-1 size-4 shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100" aria-hidden />
            <span className="sr-only">{a.severity === 'danger' ? 'Priorité haute' : 'À surveiller'}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
