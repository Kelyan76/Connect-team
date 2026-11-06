import { useEffect, useState } from 'react';
import { isLocalBackend } from '@/shared/lib/supabase';

export type DemoState = 'inutile' | 'preparation' | 'prete' | 'erreur';

/**
 * Démonstration embarquée : prépare la base dès l'affichage de la connexion
 * (premier lancement : création du schéma et du jeu de données, quelques secondes).
 */
export function useDemoReady(): DemoState {
  const [state, setState] = useState<DemoState>(isLocalBackend ? 'preparation' : 'inutile');
  useEffect(() => {
    if (!isLocalBackend) return;
    let alive = true;
    import('@/backend/local/db')
      .then((m) => m.getDb())
      .then(() => alive && setState('prete'))
      .catch((error: unknown) => {
        console.error('Base de démonstration', error);
        if (alive) setState('erreur');
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
