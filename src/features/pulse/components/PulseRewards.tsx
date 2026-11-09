import { Award, Lock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Tooltip } from '@/shared/ui/menu';
import { pulseBadges } from '../lib/badges';

/** Badges du pouls : visibles par le collaborateur seul, jamais transmis au manager. */
export function PulseRewards({ days, notes, today }: { days: string[]; notes: number; today: string }) {
  const { badges, next, best } = pulseBadges({ days, notes, today });
  const [all, setAll] = useState(false);
  const got = badges.filter((b) => b.got);
  const shown = all ? badges : got.slice(-3);

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
      {shown.map((b) => (
        <Tooltip key={b.id} content={b.hint}>
          <span
            className={cn(
              'inline-flex h-7 animate-pop-in items-center gap-1 rounded-full px-3 text-xs font-medium',
              b.got ? 'bg-gradient-to-r from-hero-from to-hero-to text-white shadow-sm' : 'bg-surface-muted text-fg-subtle',
            )}
          >
            {b.got ? <Award className="size-3" aria-hidden /> : <Lock className="size-3" aria-hidden />}
            {b.label}
          </span>
        </Tooltip>
      ))}
      {next && !all && <span className="text-xs text-fg-subtle">Prochain badge : {next.label.toLowerCase()} ({next.hint.toLowerCase()})</span>}
      <button type="button" className="ml-auto text-xs font-medium text-accent hover:underline" onClick={() => setAll((v) => !v)}>
        {all ? 'Réduire' : `Mes badges (${got.length}/${badges.length}) · record ${best} j`}
      </button>
    </div>
  );
}
