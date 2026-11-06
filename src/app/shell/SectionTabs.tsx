import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { matchesPath, sectionForPath, sectionsForRole, type Role } from './nav';

/** Onglets de la section courante (ex. Planning : Tâches · Plan de charge · Absences). */
export function SectionTabs({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const section = sectionForPath(sectionsForRole(role), pathname);
  if (!section || section.tabs.length < 2) return null;
  return (
    <div className="border-b border-line bg-surface">
      <nav
        aria-label={section.label}
        className="mx-auto flex w-full max-w-360 gap-6 overflow-x-auto px-6 lg:px-8"
      >
        {section.tabs.map((t) => {
          const active = matchesPath(t.to, pathname);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px flex h-10 shrink-0 items-center border-b-2 text-sm transition-colors',
                active
                  ? 'border-accent font-medium text-fg'
                  : 'border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
