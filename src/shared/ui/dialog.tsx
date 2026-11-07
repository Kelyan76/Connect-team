import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlay = 'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm';

interface ContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const widths = { sm: 'sm:max-w-100', md: 'sm:max-w-130', lg: 'sm:max-w-180' } as const;

/**
 * Fenêtre modale : en-tête titré, corps défilant, pied d'actions.
 * Sur téléphone, elle s'affiche en panneau qui monte du bas de l'écran (atteignable au pouce).
 */
export const DialogContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, title, description, footer, size = 'md', children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'pb-safe fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] w-full flex-col rounded-t-xl border border-line bg-surface shadow-md focus:outline-none',
          'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[12vh] sm:max-h-[76vh] sm:w-[calc(100vw-32px)] sm:-translate-x-1/2 sm:rounded-lg sm:pb-0',
          widths[size],
          className,
        )}
        {...props}
      >
        <span aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-md font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-fg-muted">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            className="-mr-1 rounded p-1 text-fg-subtle hover:bg-surface-muted hover:text-fg"
            aria-label="Fermer"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-muted/40 px-5 py-3">
            {footer}
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
DialogContent.displayName = 'DialogContent';

/** Panneau latéral droit pour consulter ou éditer un élément sans quitter la liste. */
export const SheetContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, title, description, footer, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlay} />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-130 flex-col border-l border-line bg-surface shadow-md focus:outline-none',
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <DialogPrimitive.Title className="truncate text-md font-semibold">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className={description ? 'text-sm text-fg-muted' : 'sr-only'}>
              {description ?? title}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close
            className="-mr-1 rounded p-1 text-fg-subtle hover:bg-surface-muted hover:text-fg"
            aria-label="Fermer"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ),
);
SheetContent.displayName = 'SheetContent';
