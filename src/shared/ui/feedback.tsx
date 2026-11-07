import { AlertCircle, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from './button';

export function Skeleton({ className }: { className?: string }) {
  // Reflet lumineux qui glisse : chargement perçu comme plus rapide qu'un simple clignotement.
  return (
    <div
      className={cn(
        'animate-shimmer rounded bg-[linear-gradient(90deg,hsl(var(--surface-muted))_25%,hsl(var(--line))_50%,hsl(var(--surface-muted))_75%)] bg-[length:200%_100%]',
        className,
      )}
    />
  );
}

/** Squelette de tableau : reproduit la grille réelle pour éviter les sauts de mise en page. */
export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-10 items-center gap-6 px-4">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} className={cn('h-3', c === 0 ? 'w-40' : 'w-20', c === columns - 1 && 'ml-auto w-12')} />
          ))}
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** État vide utile : ce qui manque, pourquoi, et l'action pour y remédier. */
export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex animate-page-in flex-col items-start gap-3 px-5 py-8', className)}>
      {icon && <span className="text-fg-subtle [&_svg]:size-5">{icon}</span>}
      <div className="flex max-w-prose flex-col gap-1">
        <p className="text-base font-medium text-fg">{title}</p>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : 'Les données n’ont pas pu être chargées.';
  return (
    <div role="alert" className={cn('flex items-start gap-3 px-5 py-6', className)}>
      <AlertCircle className="mt-px size-4 shrink-0 text-danger" aria-hidden />
      <div className="flex flex-col items-start gap-2">
        <div>
          <p className="text-base font-medium text-fg">Chargement impossible</p>
          <p className="text-sm text-fg-muted">{message}</p>
        </div>
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            <RotateCcw aria-hidden />
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line bg-surface-muted px-1 font-sans text-xs text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
