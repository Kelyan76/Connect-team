import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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

/**
 * En-tête de page : titre, phrase courte, actions. Le fil d'Ariane n'est plus affiché
 * (la section et l'onglet actifs indiquent déjà où l'on est) ; il reste lu par les lecteurs d'écran.
 */
export function PageHeader({ title, breadcrumbs, description, actions, meta }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-2 pb-6">
      <div className="sr-only">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold text-fg">{title}</h1>
          {description && <p className="max-w-prose text-base text-fg-muted">{description}</p>}
          {meta}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

/** Conteneur de page : largeur maximale et marges constantes ; place pour la barre mobile en bas. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-300 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-10 lg:pt-8', className)}>
      {children}
    </div>
  );
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

/** Carte blanche arrondie, ombre très légère. */
export function Panel({ title, description, actions, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={cn('min-w-0 overflow-hidden rounded-lg border border-line bg-surface shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex min-h-14 items-center justify-between gap-3 px-5 pb-2 pt-4">
          <div className="flex min-w-0 flex-col">
            {title && <h2 className="truncate text-md font-semibold text-fg">{title}</h2>}
            {description && <p className="truncate text-sm text-fg-subtle">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!flush && 'px-5 pb-5 pt-2', !flush && !(title || actions) && 'pt-5', bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

/**
 * Filtres secondaires : en ligne sur grand écran ; sur téléphone, repliés derrière
 * un bouton « Filtres » (avec le nombre de filtres actifs) pour ne pas allonger la page.
 */
export function CollapsibleFilters({ active, children }: { active: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium sm:hidden',
          active > 0 ? 'border-accent bg-accent-subtle text-accent' : 'border-line bg-surface text-fg-muted',
        )}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filtres{active > 0 ? ` (${active})` : ''}
      </button>
      <div className={cn('w-full flex-col gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center', open ? 'flex' : 'hidden')}>
        {children}
      </div>
    </>
  );
}

/** Barre de filtres au-dessus d'une liste. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2 pb-4', className)}>{children}</div>;
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
