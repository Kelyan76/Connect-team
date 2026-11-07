import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, type LucideIcon } from 'lucide-react';
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
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <div className={cn('h-full rounded-full', barTone[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export type StatTone = 'accent' | 'success' | 'warning' | 'danger' | 'violet';

const tileTone: Record<StatTone, string> = {
  accent: 'bg-accent-subtle text-accent',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  violet: 'bg-level-1 text-accent-hover',
};

interface StatProps {
  label: string;
  value: ReactNode;
  /** Icône dans une pastille colorée, à gauche de la valeur. */
  icon?: LucideIcon;
  tone?: StatTone;
  /** Écart vs période précédente, déjà formaté ; le signe est donné par `trend`. */
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  /** Une hausse est-elle favorable ? (ex. tâches en retard : non) */
  upIsGood?: boolean;
  hint?: ReactNode;
  className?: string;
  /** Rend la carte cliquable (ouvre le détail). */
  onClick?: () => void;
}

/** Indicateur clé : libellé gris, valeur en tabular-nums, variation discrète. */
export function Stat({ label, value, icon: TileIcon, tone = 'accent', delta, trend = 'flat', upIsGood = true, hint, className, onClick }: StatProps) {
  const good = trend === 'flat' ? null : (trend === 'up') === upIsGood;
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const Root = onClick ? 'button' : 'div';
  return (
    <Root
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'relative flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface p-4 text-left shadow-sm sm:p-5',
        onClick && 'transition-all hover:border-line-strong hover:shadow-md active:scale-[0.99]',
        className,
      )}
    >
      {onClick && <ChevronRight className="absolute right-3 top-3 size-4 text-fg-subtle" aria-hidden />}
      {TileIcon && (
        <span className={cn('mb-2 flex size-10 items-center justify-center rounded', tileTone[tone])}>
          <TileIcon className="size-5" aria-hidden />
        </span>
      )}
      <span className="tabular text-xl font-semibold text-fg">{value}</span>
      <span className="line-clamp-2 text-sm text-fg-muted">{label}</span>
      <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-fg-subtle">
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
        {hint && <span>{hint}</span>}
      </span>
    </Root>
  );
}

/** Grille de KPI en cartes : 2 colonnes sur téléphone, 4 sur grand écran. */
export function StatGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4', className)}>{children}</div>;
}
