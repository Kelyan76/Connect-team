import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
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
        'group flex h-9 items-center gap-3 rounded px-2 text-base transition-colors',
        active
          ? 'bg-surface-muted font-medium text-fg'
          : 'text-fg-muted hover:bg-surface-muted/70 hover:text-fg',
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
            <span className="tabular ml-auto text-xs font-medium text-fg-subtle">{badge}</span>
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
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface md:flex',
        collapsed ? 'w-14' : 'w-56',
      )}
      aria-label="Navigation principale"
    >
      <div
        className={cn(
          'flex h-12 items-center gap-2 border-b border-line px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <svg viewBox="0 0 32 32" className="size-5 shrink-0" aria-hidden>
          <rect width="32" height="32" rx="6" className="fill-accent" />
          <path
            d="M9 21.5V10.5h3v11zM14.5 21.5V14h3v7.5zM20 21.5V17h3v4.5z"
            className="fill-accent-fg"
          />
        </svg>
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-base font-semibold">Connect Team</span>
            <span className="truncate text-xs text-fg-subtle">{teamName}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-px">
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

      <div className="flex flex-col gap-px border-t border-line px-2 py-2">
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
            'flex h-9 items-center gap-3 rounded px-2 text-base text-fg-muted hover:bg-surface-muted/70 hover:text-fg',
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
