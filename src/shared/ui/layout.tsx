import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Fil d'Ariane">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-subtle">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="rounded-sm hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  breadcrumbs: Crumb[];
  description?: ReactNode;
  /** Actions principales : toujours en haut à droite, la primaire en dernier. */
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ title, breadcrumbs, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 pb-5">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="max-w-prose text-base text-fg-muted">{description}</p>}
          {meta}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Conteneur de page : largeur maximale et marges constantes sur tous les écrans. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-360 px-6 py-6 lg:px-8', className)}>{children}</div>;
}

interface PanelProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Pas de marge interne : pour les tableaux qui vont jusqu'au bord. */
  flush?: boolean;
}

/** Zone délimitée par une bordure fine. Remplace les « cartes » à ombre portée. */
export function Panel({ title, description, actions, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-line bg-surface', className)}>
      {(title || actions) && (
        <div className="flex min-h-11 items-center justify-between gap-3 border-b border-line px-4 py-2">
          <div className="flex min-w-0 flex-col">
            {title && <h2 className="truncate text-base font-semibold text-fg">{title}</h2>}
            {description && <p className="truncate text-xs text-fg-subtle">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!flush && 'p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Barre de filtres au-dessus d'une liste. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 pb-3', className)}>{children}</div>;
}

/** Paire libellé / valeur pour les fiches (définitions). */
export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-base">
      {items.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-fg-subtle">{item.label}</dt>
          <dd className="min-w-0 text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
