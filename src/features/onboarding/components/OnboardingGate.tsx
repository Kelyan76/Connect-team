import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useCurrentUser } from '@/features/auth/AuthProvider';
import { proposedKey } from '../lib/onboarding';
import { useOnboardingStatus } from '../use-onboarding';

const wasProposed = (k: string) => {
  try {
    return localStorage.getItem(k) === '1';
  } catch {
    return false;
  }
};
const markProposed = (k: string) => {
  try {
    localStorage.setItem(k, '1');
  } catch {
    // stockage indisponible : proposé à chaque chargement, sans gravité
  }
};

/**
 * À chaque connexion, tant que le profil n'est pas complet (DISC, compétences),
 * la personne arrive sur le parcours de bienvenue. « Plus tard » la laisse tranquille jusqu'à la prochaine connexion.
 */
export function OnboardingGate() {
  const { state } = useAuth();
  const { profile } = useCurrentUser();
  const { ready, complete } = useOnboardingStatus();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const signedInAt = state.status === 'signed_in' ? state.session.user.last_sign_in_at : null;
  const k = proposedKey(profile.id, signedInAt);

  useEffect(() => {
    if (!ready || complete || pathname === '/bienvenue' || wasProposed(k)) return;
    markProposed(k);
    navigate('/bienvenue', { replace: true });
  }, [ready, complete, pathname, k, navigate]);

  return null;
}
