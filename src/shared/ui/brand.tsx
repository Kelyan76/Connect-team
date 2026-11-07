import { cn } from '@/shared/lib/cn';

/** Logo Connect Team : trois barres croissantes dans un carré à l'accent. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-5 shrink-0', className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-accent" />
      <path d="M9 21.5V10.5h3v11zM14.5 21.5V14h3v7.5zM20 21.5V17h3v4.5z" className="fill-accent-fg" />
    </svg>
  );
}
