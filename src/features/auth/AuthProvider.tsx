import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toUserMessage } from '@/shared/lib/errors';
import { supabase } from '@/shared/lib/supabase';
import { toast } from '@/shared/ui/toaster';
import { fetchProfile, fetchTeam, signOut, type Profile, type Team } from './api';
import { clearDemoReturn } from './demo-switch';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'error'; message: string }
  | { status: 'signed_in'; session: Session; profile: Profile; team: Team };

interface AuthContextValue {
  state: AuthState;
  /** Session ouverte mais profil pas encore chargé (ex. définition du mot de passe). */
  session: Session | null;
  signOut: (reason?: string) => Promise<void>;
  /** Recharge le profil connecté (après modification de l'avatar, par exemple). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  // Changement d'utilisateur sans déconnexion (compte de démonstration) : aucune donnée de l'ancien
  // compte ne doit rester en cache.
  const previousUser = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (previousUser.current && userId && previousUser.current !== userId) queryClient.clear();
    previousUser.current = userId;
  }, [userId, queryClient]);

  useEffect(() => {
    if (session === undefined) return;
    if (!session || !userId) {
      setState({ status: 'signed_out' });
      queryClient.clear();
      return;
    }
    let cancelled = false;
    // Nouvel utilisateur : on repasse par l'écran de chargement plutôt que d'afficher l'ancien profil.
    setState((s) => (s.status === 'signed_in' && s.profile.id !== userId ? { status: 'loading' } : s));
    (async () => {
      try {
        const profile = await fetchProfile(userId);
        if (!profile.is_active) throw new Error('Ce compte a été désactivé. Contactez votre responsable.');
        const team = await fetchTeam(profile.team_id);
        if (!cancelled) setState({ status: 'signed_in', session, profile, team });
      } catch (error) {
        if (cancelled) return;
        await supabase.auth.signOut();
        toast.error(error instanceof Error && !('code' in error) ? error.message : toUserMessage(error));
        setState({ status: 'signed_out' });
      }
    })();
    return () => {
      cancelled = true;
    };
    // La session change à chaque rafraîchissement de jeton : seul l'utilisateur compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, session === null]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session: session ?? null,
      signOut: async (reason?: string) => {
        clearDemoReturn();
        await signOut();
        queryClient.clear();
        if (reason) toast(reason);
      },
      refreshProfile: async () => {
        if (state.status !== 'signed_in') return;
        const profile = await fetchProfile(state.profile.id);
        setState((s) => (s.status === 'signed_in' && s.profile.id === profile.id ? { ...s, profile } : s));
      },
    }),
    [state, session, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

/** Profil connecté : à utiliser uniquement sous une route protégée. */
export function useCurrentUser(): { profile: Profile; team: Team; isManager: boolean } {
  const { state } = useAuth();
  if (state.status !== 'signed_in') throw new Error('Utilisateur non connecté');
  return { profile: state.profile, team: state.team, isManager: state.profile.role === 'manager' };
}
