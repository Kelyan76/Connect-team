import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { applyAppearance, cachedAppearance } from '../appearance';

/**
 * Thème de base clair. L'ambiance choisie par chacun (Mon profil › Apparence) est appliquée
 * dès le démarrage depuis l'appareil, puis synchronisée avec le profil une fois connecté.
 */
type Resolved = 'clair';

interface ThemeContextValue {
  resolved: Resolved;
}

const VALUE: ThemeContextValue = { resolved: 'clair' };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    applyAppearance(cachedAppearance());
    try {
      localStorage.removeItem('cadence.theme');
    } catch {
      // stockage indisponible : rien à nettoyer
    }
  }, []);
  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans ThemeProvider');
  return ctx;
}
