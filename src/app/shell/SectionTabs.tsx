import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { matchesPath, sectionForPath, sectionsForRole, type Role } from './nav';
import { SECTION_COLOR } from './section-colors';

/** Onglets de la section courante (ex. Planning : Tâches · Plan de charge · Absences), en pastilles défilantes. */
export function SectionTabs({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const section = sectionForPath(sectionsForRole(role), pathname);
  if (!section || section.tabs.length < 2) return null;
  return (
    <div className="mx-auto w-full max-w-300 px-4 pt-4 sm:px-6 lg:px-10 lg:pt-6">
      <nav aria-label={section.label} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {section.tabs.map((t) => {
          const active = matchesPath(t.to, pathname);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-9 shrink-0 items-center rounded-full px-4 text-sm transition-colors',
                active
                  ? cn(SECTION_COLOR[section.tone].solid, 'shadow-md')
                  : 'border border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
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
