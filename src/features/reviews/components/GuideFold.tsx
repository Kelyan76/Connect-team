import { ChevronDown, Timer } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Guide de conduite replié par défaut, pour garder le compte-rendu court.
 * Le contenu reste monté une fois ouvert (le chronomètre continue même replié).
 */
export function GuideFold({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const id = useId();

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen((o) => !o);
          setOpened(true);
        }}
        className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-sec-reviews/10 text-sec-reviews">
          <Timer className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-base font-medium">Conduire l’entretien (kit Keylia)</span>
          <span className="text-sm text-fg-muted">
            Check-list, 3 × 10 minutes chronométrées, priorité et objectif SMART
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-fg-subtle transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div id={id} hidden={!open} className={cn(open && 'animate-page-in')}>
        {opened && children}
      </div>
    </div>
  );
}
