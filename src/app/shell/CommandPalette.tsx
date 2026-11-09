import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CornerDownLeft, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command';
import { Kbd } from '@/shared/ui/feedback';
import { ETHICS_ITEM, itemLabel, navForRole, SETTINGS_ITEM, type Role } from './nav';

export interface PaletteEntry {
  id: string;
  group: string;
  label: string;
  detail?: string;
  to: string;
  icon: LucideIcon;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  entries: PaletteEntry[];
}

/** Palette Cmd/Ctrl+K : navigation et recherche globale (personnes, objectifs, entretiens…). */
export function CommandPalette({ open, onOpenChange, role, entries }: CommandPaletteProps) {
  const navigate = useNavigate();
  const pages = navForRole(role).flatMap((g) => g.items);
  if (role === 'manager') pages.push(SETTINGS_ITEM);
  pages.push(ETHICS_ITEM);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const groups = Array.from(new Set(entries.map((e) => e.group)));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-32px)] max-w-150 -translate-x-1/2 overflow-hidden rounded-lg border border-line bg-surface shadow-md focus:outline-none">
          <DialogPrimitive.Title className="sr-only">Palette de commandes</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Recherchez une page ou un élément, puis validez avec Entrée.
          </DialogPrimitive.Description>
          <Command loop>
            <CommandInput placeholder="Rechercher…" />
            <CommandList>
              <CommandEmpty>Aucun résultat.</CommandEmpty>
              <CommandGroup heading="Aller à">
                {pages.map((p) => (
                  <CommandItem key={p.to} value={`page ${itemLabel(p, role)}`} onSelect={() => go(p.to)}>
                    <p.icon aria-hidden />
                    {itemLabel(p, role)}
                  </CommandItem>
                ))}
              </CommandGroup>
              {groups.map((group) => (
                <CommandGroup key={group} heading={group}>
                  {entries
                    .filter((e) => e.group === group)
                    .map((e) => (
                      <CommandItem
                        key={e.id}
                        value={`${e.id} ${e.label} ${e.detail ?? ''}`}
                        keywords={e.keywords}
                        onSelect={() => go(e.to)}
                      >
                        <e.icon aria-hidden />
                        <span className="truncate">{e.label}</span>
                        {e.detail && <span className="ml-auto truncate text-xs text-fg-subtle">{e.detail}</span>}
                      </CommandItem>
                    ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-xs text-fg-subtle">
              <span className="flex items-center gap-1">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> naviguer
              </span>
              <span className="flex items-center gap-1">
                <Kbd>
                  <CornerDownLeft className="size-3" aria-hidden />
                </Kbd>
                ouvrir
              </span>
              <span className="flex items-center gap-1">
                <Kbd>Échap</Kbd> fermer
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
