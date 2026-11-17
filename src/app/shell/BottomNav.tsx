import { LayoutGrid, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import {
  ETHICS_ITEM,
  MOBILE_BAR,
  matchesPath,
  SETTINGS_ITEM,
  sectionsForRole,
  type Role,
} from './nav';
import { SECTION_COLOR } from './section-colors';

const slot =
  'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs transition-colors';

/**
 * Barre de navigation fixée en bas de l'écran sur téléphone (la barre latérale prend le relais dès la tablette) :
 * 4 raccourcis selon le rôle, et « Menu » qui affiche toutes les pages, classées par section.
 */
export function BottomNav({ role }: { role: Role }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const sections = sectionsForRole(role);
  const bar = MOBILE_BAR[role].flatMap((id) => sections.filter((s) => s.id === id));
  const onBar = bar.some((s) => s.tabs.some((t) => matchesPath(t.to, pathname)));

  return (
    <>
      <nav
        aria-label="Navigation principale"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 shadow-up backdrop-blur md:hidden"
      >
        <ul className="grid grid-cols-5">
          {bar.map((s) => {
            const active = s.tabs.some((t) => matchesPath(t.to, pathname));
            const color = SECTION_COLOR[s.tone];
            return (
              <li key={s.id}>
                <Link
                  to={s.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(slot, active ? cn('font-semibold', color.text) : 'text-fg-subtle')}
                >
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-all duration-300 ease-out',
                      active ? cn('scale-100', color.solid, 'shadow-sm') : 'scale-90',
                    )}
                  >
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="max-w-full truncate text-[11px] leading-none tracking-tight">
                    {s.shortLabel}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className={cn(slot, !onBar ? 'font-semibold text-accent' : 'text-fg-subtle')}
            >
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-all',
                  !onBar ? 'bg-accent text-white shadow-sm' : 'scale-90',
                )}
              >
                <LayoutGrid className="size-5" aria-hidden />
              </span>
              <span className="text-[11px] leading-none tracking-tight">Menu</span>
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Toutes les pages" description="Touchez une page pour y aller.">
          <div className="flex flex-col gap-5">
            {sections.map((s) => (
              <section key={s.id} className="flex flex-col gap-2">
                <h3
                  className={cn(
                    'flex items-center gap-2 text-xs font-semibold uppercase tracking-wide',
                    SECTION_COLOR[s.tone].text,
                  )}
                >
                  <span
                    className={cn('size-1.5 rounded-full', SECTION_COLOR[s.tone].solid)}
                    aria-hidden
                  />
                  {s.label}
                </h3>
                <ul className="grid grid-cols-2 gap-2">
                  {s.tabs.map((t) => {
                    const active = matchesPath(t.to, pathname);
                    return (
                      <li key={t.to}>
                        <Link
                          to={t.to}
                          onClick={() => setOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex h-12 items-center gap-2 rounded border px-3 text-sm transition-colors',
                            active
                              ? cn('border-transparent font-medium', SECTION_COLOR[s.tone].soft)
                              : 'border-line bg-surface hover:bg-surface-muted',
                          )}
                        >
                          <t.icon
                            className={cn('size-4 shrink-0', SECTION_COLOR[s.tone].text)}
                            aria-hidden
                          />
                          <span className="truncate">{t.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <ul className="grid grid-cols-2 gap-2 border-t border-line pt-4">
              {[
                { to: '/profil', label: 'Mon profil', icon: UserRound },
                { to: ETHICS_ITEM.to, label: ETHICS_ITEM.label, icon: ShieldCheck },
                ...(role === 'manager'
                  ? [{ to: SETTINGS_ITEM.to, label: SETTINGS_ITEM.label, icon: SETTINGS_ITEM.icon }]
                  : []),
              ].map((i) => (
                <li key={i.to}>
                  <Link
                    to={i.to}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center gap-2 rounded border border-line bg-surface px-3 text-sm hover:bg-surface-muted"
                  >
                    <i.icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="truncate">{i.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
