import { cn } from '@/shared/lib/cn';
import { Tooltip } from '@/shared/ui/menu';
import { LEVER_STATUS, LEVERS, type LeverState } from '../lib/dream';

/** Les cinq lettres D R E A M, colorées selon l'état de chaque levier. */
export function LeverChips({ states, size = 'md' }: { states: LeverState[]; size?: 'sm' | 'md' }) {
  return (
    <span className="flex gap-1" role="list" aria-label="Leviers DREAM">
      {states.map((s) => (
        <Tooltip key={s.lever} content={`${LEVERS[s.lever].name} · ${LEVER_STATUS[s.status].label} : ${s.detail}`}>
          <span
            role="listitem"
            aria-label={`${LEVERS[s.lever].name} : ${LEVER_STATUS[s.status].label}`}
            className={cn(
              'inline-flex items-center justify-center rounded-full font-semibold',
              size === 'sm' ? 'size-6 text-xs' : 'size-8 text-sm',
              LEVER_STATUS[s.status].chip,
            )}
          >
            {s.lever}
          </span>
        </Tooltip>
      ))}
    </span>
  );
}
