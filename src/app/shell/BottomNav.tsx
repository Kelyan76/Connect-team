import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { matchesPath, sectionsForRole, type Role } from './nav';

/** Barre de navigation fixée en bas de l'écran sur téléphone (la barre latérale prend le relais dès la tablette). */
export function BottomNav({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const sections = sectionsForRole(role);
  return (
    <nav
      aria-label="Navigation principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-up backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${sections.length}, minmax(0, 1fr))` }}>
        {sections.map((s) => {
          const active = s.tabs.some((t) => matchesPath(t.to, pathname));
          return (
            <li key={s.label}>
              <Link
                to={s.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs transition-colors',
                  active ? 'font-medium text-accent' : 'text-fg-subtle',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active && 'bg-accent-subtle',
                  )}
                >
                  <s.icon className="size-5" aria-hidden />
                </span>
                <span className="max-w-full truncate text-[11px] leading-none tracking-tight">{s.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
