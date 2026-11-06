import { useState, type ReactNode } from 'react';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { CommandPalette, type PaletteEntry } from './CommandPalette';
import { Header, type ShellUser } from './Header';
import { MobileNav } from './MobileNav';
import type { Role } from './nav';
import { SectionTabs } from './SectionTabs';
import { Sidebar } from './Sidebar';

const COLLAPSE_KEY = 'cadence.sidebar.collapsed';

function initialCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    if (stored !== null) return stored === '1';
  } catch {
    // ignore
  }
  return window.innerWidth < 1024;
}

interface AppShellProps {
  role: Role;
  user: ShellUser;
  teamName: string;
  onSignOut: () => void;
  searchEntries?: PaletteEntry[];
  notifications?: ReactNode;
  badges?: Partial<Record<string, number>>;
  children: ReactNode;
}

export function AppShell({ role, user, teamName, onSignOut, searchEntries = [], notifications, badges, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useHotkey('mod+k', () => setPaletteOpen((o) => !o));

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // ignore
      }
      return !c;
    });

  return (
    <div className="flex min-h-screen bg-canvas">
      <a
        href="#contenu"
        className="sr-only z-50 rounded bg-surface px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <Sidebar role={role} collapsed={collapsed} onToggle={toggle} teamName={teamName} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          onOpenPalette={() => setPaletteOpen(true)}
          onSignOut={onSignOut}
          notifications={notifications}
          mobileNav={<MobileNav role={role} />}
        />
        <SectionTabs role={role} />
        <main id="contenu" className="flex-1" tabIndex={-1}>
          {children}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={role} entries={searchEntries} />
    </div>
  );
}
