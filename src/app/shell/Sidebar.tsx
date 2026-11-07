import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { BrandMark } from '@/shared/ui/brand';
import { Tooltip } from '@/shared/ui/menu';
import { itemLabel, matchesPath, sectionsForRole, SETTINGS_ITEM, type Role } from './nav';

interface SidebarProps {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  teamName: string;
  badges?: Partial<Record<string, number>>;
}

interface EntryProps {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}

function Entry({ to, label, icon: Icon, active, collapsed, badge }: EntryProps) {
  const link = (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-10 items-center gap-3 rounded px-3 text-base transition-colors',
        active
          ? 'bg-accent font-medium text-sidebar-fg shadow-sm'
          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <>
          <span className="truncate">{label}</span>
          {badge ? (
            <span className="tabular ml-auto text-xs font-medium opacity-80">{badge}</span>
          ) : null}
        </>
      )}
    </Link>
  );
  return collapsed ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

export function Sidebar({ role, collapsed, onToggle, teamName, badges = {} }: SidebarProps) {
  const { pathname } = useLocation();
  const sections = sectionsForRole(role);
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-fg md:flex',
        collapsed ? 'w-16' : 'w-60',
      )}
      aria-label="Navigation principale"
    >
      <div
        className={cn(
          'flex h-16 items-center gap-3 px-5',
          collapsed && 'justify-center px-0',
        )}
      >
        <BrandMark className="size-7" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-base font-semibold">Connect Team</span>
            <span className="truncate text-xs text-sidebar-muted">{teamName}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {sections.map((s) => {
            const badge = s.tabs.reduce((sum, t) => sum + (badges[t.to] ?? 0), 0);
            return (
              <li key={s.label}>
                <Entry
                  to={s.to}
                  label={s.label}
                  icon={s.icon}
                  active={s.tabs.some((t) => matchesPath(t.to, pathname))}
                  collapsed={collapsed}
                  badge={badge || undefined}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-hover px-3 py-3">
        {role === 'manager' && (
          <Entry
            to={SETTINGS_ITEM.to}
            label={itemLabel(SETTINGS_ITEM, role)}
            icon={SETTINGS_ITEM.icon}
            active={matchesPath(SETTINGS_ITEM.to, pathname)}
            collapsed={collapsed}
          />
        )}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex h-10 items-center gap-3 rounded px-3 text-base text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
          {!collapsed && <span>Replier</span>}
        </button>
      </div>
    </aside>
  );
}
