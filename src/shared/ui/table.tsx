import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import type { SortState } from '@/shared/hooks/use-sort';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table ref={ref} className={cn('w-full border-collapse text-base', className)} {...props} />
    </div>
  ),
);
Table.displayName = 'Table';

export const THead = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead {...props} className={cn('border-b border-line bg-surface-muted/50', props.className)} />
);

export const TBody = (props: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody {...props} className={cn('divide-y divide-line', props.className)} />
);

export const Tr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn('transition-colors hover:bg-surface-muted/50', className)} {...props} />
  ),
);
Tr.displayName = 'Tr';

type Align = 'left' | 'right' | 'center';
const alignClass: Record<Align, string> = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function Th({
  className,
  align = 'left',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: Align }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-8 whitespace-nowrap px-3 text-xs font-medium text-fg-subtle first:pl-4 last:pr-4',
        alignClass[align],
        className,
      )}
      {...props}
    />
  );
}

/** En-tête triable : clic ou Entrée pour trier, état annoncé via aria-sort. */
export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
  className,
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  align?: Align;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('h-8 whitespace-nowrap px-3 first:pl-4 last:pr-4', alignClass[align], className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded-sm text-xs font-medium hover:text-fg',
          active ? 'text-fg' : 'text-fg-subtle',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        <Icon className={cn('size-3', !active && 'opacity-60')} aria-hidden />
      </button>
    </th>
  );
}

export function Td({
  className,
  align = 'left',
  numeric = false,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: Align; numeric?: boolean }) {
  return (
    <td
      className={cn(
        'h-10 px-3 align-middle first:pl-4 last:pr-4',
        alignClass[numeric ? 'right' : align],
        numeric && 'tabular whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}
