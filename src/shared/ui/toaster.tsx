import { Toaster as Sonner } from 'sonner';

/** Notifications discrètes en bas à droite, sur les tokens de l'application. */
export function Toaster({ dark }: { dark: boolean }) {
  return (
    <Sonner
      theme={dark ? 'dark' : 'light'}
      position="bottom-right"
      duration={4000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-90 items-start gap-3 rounded border border-line bg-surface px-4 py-3 text-base text-fg shadow-md',
          title: 'font-medium',
          description: 'text-sm text-fg-muted',
          success: '[&_[data-icon]]:text-success',
          error: '[&_[data-icon]]:text-danger',
          actionButton: 'ml-auto text-sm font-medium text-accent hover:underline',
          icon: 'mt-px [&_svg]:size-4',
        },
      }}
    />
  );
}

export { toast } from 'sonner';
