import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObservationDialog } from '@/features/notebook/components/ObservationDialog';
import { cn } from '@/shared/lib/cn';
import { useQuickActions, type QuickAction } from './quick-actions';
import { SECTION_COLOR } from './section-colors';

const base =
  'flex h-full w-full rounded-lg border border-line bg-surface shadow-sm transition-all hover:-translate-y-px hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.98]';
// Téléphone : raccourci compact (icône au-dessus d'un libellé court) ; dès la tablette : tuile avec libellé et précision.
const compact = 'flex-col items-center gap-2 p-3 text-center sm:items-start sm:p-4 sm:text-left';
// Première action (prochain 1 à 1) : une ligne pleine largeur sur téléphone.
const wide = 'flex-row items-center gap-3 p-3 text-left sm:flex-col sm:items-start sm:gap-2 sm:p-4';

function TileBody({ action, isWide }: { action: QuickAction; isWide: boolean }) {
  return (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded',
          SECTION_COLOR[action.tone].soft,
        )}
      >
        <action.icon className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn('text-sm font-medium leading-tight text-fg', !isWide && 'sm:hidden')}>
          {isWide ? action.label : action.short}
        </span>
        {!isWide && (
          <span className="hidden text-sm font-medium leading-tight text-fg sm:block">
            {action.label}
          </span>
        )}
        <span className={cn('truncate text-xs text-fg-subtle', !isWide && 'hidden sm:block')}>
          {action.hint}
        </span>
      </span>
    </>
  );
}

/** Actions les plus fréquentes, en tête de l'accueil. */
export function QuickActions() {
  const actions = useQuickActions().filter((a) => !a.notOnHome);
  const [noting, setNoting] = useState(false);

  return (
    <section aria-labelledby="actions-rapides" className="mb-6">
      <h2 id="actions-rapides" className="mb-3 text-base font-semibold">
        Actions rapides
      </h2>
      <ul className="stagger grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-6">
        {actions.map((a, i) => {
          const isWide = i === 0 && (a.id === 'next' || a.id === 'prep' || a.id === 'request');
          const cls = cn(base, isWide ? wide : compact);
          return (
            <li key={a.id} className={cn(isWide && 'col-span-3 sm:col-span-1')}>
              {a.to ? (
                <Link to={a.to} className={cls} aria-label={a.label}>
                  <TileBody action={a} isWide={isWide} />
                </Link>
              ) : (
                <button
                  type="button"
                  className={cls}
                  aria-label={a.label}
                  onClick={() => setNoting(true)}
                >
                  <TileBody action={a} isWide={isWide} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <ObservationDialog open={noting} onOpenChange={setNoting} />
    </section>
  );
}
