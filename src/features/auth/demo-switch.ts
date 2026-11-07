import { AppError } from '@/shared/lib/errors';
import { queryClient } from '@/shared/lib/query-client';
import { supabase } from '@/shared/lib/supabase';
import { signIn } from './api';

/**
 * Test « en tant que collaborateur » : le manager se connecte en un clic à un compte de démonstration
 * de son équipe, puis revient à son compte sans retaper son mot de passe.
 * La session du manager est gardée dans sessionStorage (onglet courant uniquement), comme Supabase
 * garde déjà la session active dans le stockage du navigateur.
 */
const KEY = 'cadence.demo.return';

export interface DemoReturn {
  access_token: string;
  refresh_token: string;
  /** Prénom du manager, pour le bouton de retour. */
  name: string;
}

export function readDemoReturn(): DemoReturn | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoReturn) : null;
  } catch {
    return null;
  }
}

export function clearDemoReturn(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // stockage indisponible
  }
}

/** Se connecter à un compte de démonstration ; garde (une seule fois) la session du manager pour le retour. */
export async function switchToDemoAccount(email: string, password: string, managerName: string): Promise<void> {
  if (!readDemoReturn()) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        sessionStorage.setItem(
          KEY,
          JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token, name: managerName } satisfies DemoReturn),
        );
      } catch {
        // sans stockage, le retour demandera une reconnexion classique
      }
    }
  }
  queryClient.clear();
  await signIn(email, password);
}

/** Revenir au compte manager mémorisé. */
export async function returnToManager(): Promise<void> {
  const saved = readDemoReturn();
  if (!saved) throw new AppError('Reconnectez-vous avec votre compte manager.');
  queryClient.clear();
  const { error } = await supabase.auth.setSession({ access_token: saved.access_token, refresh_token: saved.refresh_token });
  clearDemoReturn();
  if (error) {
    await supabase.auth.signOut();
    throw new AppError('Votre session manager a expiré : reconnectez-vous.', error);
  }
}
