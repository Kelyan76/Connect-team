import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/menu';
import { itemLabel, matchesPath, sectionsForRole, SETTINGS_ITEM, type Role } from './nav';

/** Menu des sections sur petit écran (la barre latérale n'est affichée qu'à partir de la tablette). */
export function MobileNav({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const sections = sectionsForRole(role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 shrink-0 items-center justify-center rounded hover:bg-surface-muted md:hidden"
        aria-label="Menu"
      >
        <Menu className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {sections.map((s) => {
          const active = s.tabs.some((t) => matchesPath(t.to, pathname));
          return (
            <DropdownMenuItem key={s.label} asChild>
              <Link to={s.to} className={cn(active && 'font-medium text-fg')}>
                <s.icon aria-hidden />
                {s.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
        {role === 'manager' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={SETTINGS_ITEM.to}>
                <SETTINGS_ITEM.icon aria-hidden />
                {itemLabel(SETTINGS_ITEM, role)}
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
