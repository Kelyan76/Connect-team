import { cn } from '@/shared/lib/cn';
import { parseAvatar } from '@/shared/lib/avatar';
import { fullName, initials, type NamedPerson } from '@/shared/lib/format';
import { AvatarArt } from './avatar-art';

/** Une personne, avec son avatar personnalisé éventuel (profiles.avatar). */
type AvatarPerson = NamedPerson & { avatar?: unknown };

const sizes = {
  xs: 'size-5 text-xs tracking-tighter',
  sm: 'size-6 text-xs',
  md: 'size-8 text-xs',
  lg: 'size-12 text-md',
} as const;

/** Palette douce : chaque personne garde toujours la même couleur (calculée depuis son nom). */
const PALETTE = [
  'bg-sec-home/15 text-sec-home',
  'bg-sec-team/15 text-sec-team',
  'bg-sec-reviews/15 text-sec-reviews',
  'bg-sec-goals/15 text-sec-goals',
  'bg-sec-planning/15 text-sec-planning',
  'bg-sec-meetings/15 text-sec-meetings',
  'bg-mood-3/20 text-warning',
  'bg-energy-2/15 text-energy-2',
] as const;

function colorFor(person: NamedPerson): string {
  const key = `${person.first_name}${person.last_name}`;
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** Avatar personnalisé s'il existe, sinon initiales sur une pastille de couleur propre à la personne. */
export function Avatar({
  person,
  size = 'md',
  className,
}: {
  person: AvatarPerson;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const art = parseAvatar(person.avatar);
  if (art) {
    return (
      <span className={cn('inline-flex shrink-0 overflow-hidden rounded-full ring-2 ring-surface', sizes[size], className)} title={fullName(person)} aria-hidden>
        <AvatarArt config={art} className="size-full" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ring-2 ring-surface',
        colorFor(person),
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
  person: AvatarPerson;
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
