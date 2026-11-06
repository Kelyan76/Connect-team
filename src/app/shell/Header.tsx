import { LogOut, Monitor, Moon, Search, Sun, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePeriod } from '@/app/providers/period';
import { useTheme, type ThemePreference } from '@/app/providers/theme';
import { cn } from '@/shared/lib/cn';
import { fullName, type NamedPerson } from '@/shared/lib/format';
import { PERIOD_LABELS, type PeriodPreset } from '@/shared/lib/period';
import { Avatar } from '@/shared/ui/avatar';
import { Kbd } from '@/shared/ui/feedback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export interface ShellUser extends NamedPerson {
  email: string;
  job_title: string;
  roleLabel: string;
}

interface HeaderProps {
  user: ShellUser;
  onOpenPalette: () => void;
  onSignOut: () => void;
  /** Emplacement des notifications (rappels), fourni par la feature alertes. */
  notifications?: ReactNode;
  /** Menu de navigation affiché sur petit écran. */
  mobileNav?: ReactNode;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'clair', label: 'Clair', icon: Sun },
  { value: 'sombre', label: 'Sombre', icon: Moon },
  { value: 'systeme', label: 'Système', icon: Monitor },
];

export function Header({ user, onOpenPalette, onSignOut, notifications, mobileNav }: HeaderProps) {
  const { period, setPreset } = usePeriod();
  const { preference, setPreference } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      {mobileNav}
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex h-8 min-w-0 max-w-90 flex-1 items-center gap-2 rounded border border-line bg-canvas px-3 text-sm text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Rechercher…</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Select value={period.preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
          <SelectTrigger className="h-8 w-auto gap-2" aria-label="Période d'analyse">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {notifications}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex h-8 items-center gap-2 rounded pl-1 pr-2 hover:bg-surface-muted"
            aria-label="Menu du profil"
          >
            <Avatar person={user} size="sm" />
            <span className="hidden max-w-36 truncate text-sm font-medium lg:inline">{fullName(user)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <div className="flex flex-col px-2 py-2">
              <span className="text-base font-medium">{fullName(user)}</span>
              <span className="truncate text-xs text-fg-subtle">{user.email}</span>
              <span className="mt-1 text-xs text-fg-muted">
                {user.job_title} · {user.roleLabel}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profil">
                <UserRound aria-hidden />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Thème</DropdownMenuLabel>
            <div className="grid grid-cols-3 gap-1 px-1 pb-1" role="radiogroup" aria-label="Thème">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={preference === t.value}
                  onClick={() => setPreference(t.value)}
                  className={cn(
                    'flex h-7 items-center justify-center gap-1 rounded-sm text-xs text-fg-muted hover:bg-surface-muted',
                    preference === t.value && 'bg-surface-muted font-medium text-fg',
                  )}
                >
                  <t.icon className="size-3" aria-hidden />
                  {t.label}
                </button>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSignOut}>
              <LogOut aria-hidden />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
