import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import type { BadgeTone } from './badge';

const barTone: Record<BadgeTone, string> = {
  neutral: 'bg-fg-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  outline: 'bg-fg-subtle',
};

/** Barre d'avancement fine. `value` en ratio (0–1) ; au-delà de 1 la barre reste pleine. */
export function ProgressBar({
  value,
  tone = 'accent',
  className,
  label,
}: {
  value: number;
  tone?: BadgeTone;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      aria-label={label}
      className={cn('h-1 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <div className={cn('h-full rounded-full', barTone[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface StatProps {
  label: string;
  value: ReactNode;
  /** Écart vs période précédente, déjà formaté ; le signe est donné par `trend`. */
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  /** Une hausse est-elle favorable ? (ex. tâches en retard : non) */
  upIsGood?: boolean;
  hint?: ReactNode;
  className?: string;
}

/** Indicateur clé : libellé gris, valeur en tabular-nums, variation discrète. */
export function Stat({ label, value, delta, trend = 'flat', upIsGood = true, hint, className }: StatProps) {
  const good = trend === 'flat' ? null : (trend === 'up') === upIsGood;
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 px-4 py-3', className)}>
      <span className="truncate text-sm text-fg-muted">{label}</span>
      <span className="tabular text-xl font-semibold text-fg">{value}</span>
      <span className="flex items-center gap-1 text-xs text-fg-subtle">
        {delta && (
          <span
            className={cn(
              'tabular inline-flex items-center gap-px whitespace-nowrap font-medium',
              good === true && 'text-success',
              good === false && 'text-danger',
            )}
          >
            <Icon className="size-3" aria-hidden />
            {delta}
          </span>
        )}
        {hint && <span className="truncate">{hint}</span>}
      </span>
    </div>
  );
}

/** Rangée de KPI séparés par des filets verticaux, dans un seul cadre. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-line rounded-lg border border-line bg-surface lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-line lg:[&>*:nth-child(odd)]:border-r-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
