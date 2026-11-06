import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Sans projet Supabase configuré (.env.local absent), l'application tourne sur le backend
 * de démonstration embarqué (PGlite dans le navigateur), chargé à la demande.
 */
export const isLocalBackend = !configuredUrl || !configuredKey;

const LOCAL_URL = 'https://cadence.local';
const LOCAL_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const lazyLocalFetch: typeof fetch = async (input, init) => {
  const { localFetch } = await import('@/backend/local/fetch');
  return localFetch(input, init);
};

export const supabase = createClient<Database>(configuredUrl ?? LOCAL_URL, configuredKey ?? LOCAL_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: !isLocalBackend, storageKey: 'cadence.auth' },
  global: isLocalBackend ? { fetch: lazyLocalFetch } : {},
});
