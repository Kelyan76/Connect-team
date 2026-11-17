import { Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { openAssistant } from '@/features/ai/open-assistant';
import { ObservationDialog } from '@/features/notebook/components/ObservationDialog';
import { cn } from '@/shared/lib/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/menu';
import { useQuickActions } from './quick-actions';
import { SECTION_COLOR } from './section-colors';

/**
 * Bouton « + » flottant sur téléphone : les actions rapides depuis n'importe quelle page.
 * Masqué sur l'accueil (les tuiles y sont déjà) et dès la tablette.
 */
export function QuickAddButton() {
  const { pathname } = useLocation();
  const actions = useQuickActions();
  const [noting, setNoting] = useState(false);
  if (pathname === '/') return null;

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label="Actions rapides"
          className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-md transition-transform hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 active:scale-95 data-[state=open]:rotate-45 md:hidden"
          style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        >
          <Plus className="size-6" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="end"
          sideOffset={8}
          className="w-[min(18rem,calc(100vw-2rem))]"
        >
          <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
          <DropdownMenuItem className="h-auto gap-3 py-2" onSelect={openAssistant}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded bg-sec-reviews/10 [&_svg]:!text-sec-reviews">
              <Sparkles aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-base">Demander à l’assistant</span>
              <span className="truncate text-xs text-fg-subtle">
                IA : conseils, rédaction, actions
              </span>
            </span>
          </DropdownMenuItem>
          {actions.map((a) => {
            const body = (
              <>
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded [&_svg]:!text-current',
                    SECTION_COLOR[a.tone].soft,
                  )}
                >
                  <a.icon aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base">{a.label}</span>
                  <span className="truncate text-xs text-fg-subtle">{a.hint}</span>
                </span>
              </>
            );
            return a.to ? (
              <DropdownMenuItem key={a.id} asChild className="h-auto gap-3 py-2">
                <Link to={a.to}>{body}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                key={a.id}
                className="h-auto gap-3 py-2"
                onSelect={() => setNoting(true)}
              >
                {body}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <ObservationDialog open={noting} onOpenChange={setNoting} />
    </>
  );
}
