import { LogOut, Search, Settings, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { usePeriod } from '@/app/providers/period';
import { fullName, type NamedPerson } from '@/shared/lib/format';
import { PERIOD_LABELS, type PeriodPreset } from '@/shared/lib/period';
import { Avatar } from '@/shared/ui/avatar';
import { BrandMark } from '@/shared/ui/brand';
import { Kbd } from '@/shared/ui/feedback';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  teamName: string;
  onOpenPalette: () => void;
  onSignOut: () => void;
  /** Emplacement des notifications (rappels), fourni par la feature alertes. */
  notifications?: ReactNode;
  /** Lien vers les paramètres dans le menu du profil (manager). */
  showSettings?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

export function Header({ user, teamName, onOpenPalette, onSignOut, notifications, showSettings }: HeaderProps) {
  const { period, setPreset } = usePeriod();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-6">
      {/* Sur téléphone, la barre latérale est masquée : on rappelle l'application et l'équipe ici. */}
      <Link to="/" className="flex min-w-0 items-center gap-2 md:hidden">
        <BrandMark className="size-7 shrink-0" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-base font-semibold">Connect Team</span>
          <span className="truncate text-xs text-fg-subtle">{teamName}</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={onOpenPalette}
        className="hidden h-9 min-w-0 max-w-90 flex-1 items-center gap-2 rounded-full bg-surface-muted px-4 text-sm text-fg-subtle transition-colors hover:text-fg-muted md:flex"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Rechercher…</span>
        <span className="ml-auto hidden items-center gap-1 lg:flex">
          <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface-muted md:hidden"
          aria-label="Rechercher"
        >
          <Search className="size-5" aria-hidden />
        </button>

        <Select value={period.preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
          <SelectTrigger className="hidden h-9 w-auto gap-2 rounded-full sm:flex" aria-label="Période d'analyse">
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
            className="flex h-9 items-center gap-2 rounded-full pl-1 pr-1 hover:bg-surface-muted lg:pr-3"
            aria-label="Menu du profil"
          >
            <Avatar person={user} size="sm" />
            <span className="hidden max-w-36 truncate text-sm font-medium lg:inline">{fullName(user)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end">
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
            {showSettings && (
              <DropdownMenuItem asChild>
                <Link to="/parametres">
                  <Settings aria-hidden />
                  Paramètres
                </Link>
              </DropdownMenuItem>
            )}
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
