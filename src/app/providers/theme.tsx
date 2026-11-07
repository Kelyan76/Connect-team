import { createContext, useContext, useEffect, type ReactNode } from 'react';

/**
 * Thème : l'application est volontairement en clair uniquement (fond clair, lisible partout).
 * Le contexte reste en place pour les composants qui lisent `resolved`.
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
