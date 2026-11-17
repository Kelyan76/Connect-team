import { PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { BrandMark } from '@/shared/ui/brand';
import { SECTION_COLOR, type SectionTone } from './section-colors';
import { Tooltip } from '@/shared/ui/menu';
import {
  ETHICS_ITEM,
  itemLabel,
  matchesPath,
  sectionsForRole,
  SETTINGS_ITEM,
  type Role,
} from './nav';

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
  tone?: SectionTone;
}

function Entry({ to, label, icon: Icon, active, collapsed, badge, tone = 'settings' }: EntryProps) {
  const color = SECTION_COLOR[tone];
  const link = (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-9 items-center gap-3 rounded px-3 text-base transition-all duration-200',
        active
          ? cn(color.solid, 'font-medium shadow-md')
          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0 transition-transform group-hover:scale-110',
          !active && color.icon,
        )}
        aria-hidden
      />
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
      <div className={cn('flex h-16 items-center gap-3 px-5', collapsed && 'justify-center px-0')}>
        <BrandMark className="size-7" />
        {!collapsed && (
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-base font-semibold">Connect Team</span>
            <span className="truncate text-xs text-sidebar-muted">{teamName}</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {/* Toutes les pages visibles d'un coup d'œil, classées par section (pas de sous-menu à chercher). */}
        <div className="flex flex-col gap-4">
          {sections.map((s) => (
            <section key={s.id} aria-label={s.label} className="flex flex-col gap-1">
              {collapsed ? (
                <span aria-hidden className="mx-auto mb-1 h-px w-6 bg-sidebar-hover" />
              ) : (
                <h2 className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-muted">
                  <span
                    className={cn('size-1.5 rounded-full', SECTION_COLOR[s.tone].solid)}
                    aria-hidden
                  />
                  {s.label}
                </h2>
              )}
              <ul className="flex flex-col gap-0.5">
                {s.tabs.map((t) => (
                  <li key={t.to}>
                    <Entry
                      to={t.to}
                      label={t.label}
                      icon={t.icon}
                      tone={s.tone}
                      active={matchesPath(t.to, pathname)}
                      collapsed={collapsed}
                      badge={badges[t.to] || undefined}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-sidebar-hover px-3 py-3">
        <Entry
          to={ETHICS_ITEM.to}
          label={ETHICS_ITEM.label}
          icon={ETHICS_ITEM.icon}
          active={matchesPath(ETHICS_ITEM.to, pathname)}
          collapsed={collapsed}
        />
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
