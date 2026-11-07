import { useQuery } from '@tanstack/react-query';
import { weeklyFromPulses } from '@/features/pulse/lib/pulse';
import { listPulses } from '@/features/pulse/queries';
import { qk } from '@/shared/lib/query-keys';

/**
 * « Météo » hebdomadaire, désormais calculée à partir du pouls du jour (humeur et charge moyennes
 * par semaine). Alertes, rapports, préparation d'entretien et courbes la lisent sans changement ;
 * la saisie se fait uniquement par le pouls.
 */
export const useWeather = () =>
  useQuery({
    queryKey: qk.pulses,
    queryFn: listPulses,
    select: weeklyFromPulses,
  });
