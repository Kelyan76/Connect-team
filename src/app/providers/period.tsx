import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { resolvePeriod, type Period, type PeriodPreset } from '@/shared/lib/period';

interface PeriodContextValue {
  period: Period;
  setPreset: (p: PeriodPreset) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/** Période d'analyse choisie dans l'en-tête, partagée par le tableau de bord et les rapports. */
export function PeriodProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PeriodPreset>('trimestre');
  const value = useMemo(() => ({ period: resolvePeriod(preset), setPreset }), [preset]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error('usePeriod doit être utilisé dans PeriodProvider');
  return ctx;
}
