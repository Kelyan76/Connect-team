import { Check, Circle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { smartCheck, smartScore, type SmartInput } from '../lib/smart';

/** Les cinq critères SMART, vérifiés pendant la saisie. */
export function SmartCheck({ input }: { input: SmartInput }) {
  const criteria = smartCheck(input);
  const score = smartScore(criteria);
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface-muted/40 p-3" aria-live="polite">
      <span className="flex items-center justify-between text-sm font-medium">
        Objectif SMART
        <span className={cn('tabular', score === 5 ? 'text-success' : 'text-warning')}>{score} / 5</span>
      </span>
      <ul className="grid gap-2 sm:grid-cols-5">
        {criteria.map((c) => (
          <li key={c.letter} className="flex gap-2 sm:flex-col sm:gap-1">
            <span className={cn('flex items-center gap-1 text-sm font-semibold', c.ok ? 'text-success' : 'text-fg-subtle')}>
              {c.ok ? <Check className="size-4" aria-hidden /> : <Circle className="size-3" aria-hidden />}
              {c.letter} · {c.label}
            </span>
            <span className="text-xs text-fg-muted">{c.hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
