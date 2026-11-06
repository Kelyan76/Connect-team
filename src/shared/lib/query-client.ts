import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { toUserMessage } from './errors';

/**
 * Cache serveur partagé. Toute mutation en échec affiche un toast compréhensible,
 * sauf si elle gère elle-même l'erreur (meta.silent).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => count < 2 && !/droits|introuvable/.test(String(error)),
      refetchOnWindowFocus: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      if (mutation.meta?.silent) return;
      toast.error(toUserMessage(error));
    },
  }),
});

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}
