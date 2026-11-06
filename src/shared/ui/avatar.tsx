import { cn } from '@/shared/lib/cn';
import { fullName, initials, type NamedPerson } from '@/shared/lib/format';

const sizes = {
  xs: 'size-5 text-xs tracking-tighter',
  sm: 'size-6 text-xs',
  md: 'size-8 text-xs',
  lg: 'size-12 text-md',
} as const;

/** Initiales sur fond neutre : pas de couleur décorative, la hiérarchie reste typographique. */
export function Avatar({
  person,
  size = 'md',
  className,
}: {
  person: NamedPerson;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-line bg-surface-muted font-medium text-fg-muted',
        sizes[size],
        className,
      )}
      title={fullName(person)}
      aria-hidden
    >
      {initials(person)}
    </span>
  );
}

/** Avatar + nom (+ poste), pour les cellules de tableau et les listes. */
export function PersonLabel({
  person,
  detail,
  size = 'sm',
  className,
}: {
  person: NamedPerson;
  detail?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar person={person} size={size} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base text-fg">{fullName(person)}</span>
        {detail && <span className="truncate text-xs text-fg-subtle">{detail}</span>}
      </span>
    </span>
  );
}
