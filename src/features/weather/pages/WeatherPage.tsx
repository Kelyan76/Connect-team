import { useCurrentUser } from '@/features/auth/AuthProvider';
import { Page, PageHeader } from '@/shared/ui/layout';
import { TeamWeather } from '../components/TeamWeather';
import { WeatherEntry } from '../components/WeatherEntry';

export default function WeatherPage() {
  const { isManager } = useCurrentUser();
  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon espace' }, { label: isManager ? 'Météo' : 'Ma météo' }]}
        title={isManager ? 'Météo d’équipe' : 'Ma météo'}
        description={
          isManager
            ? 'Humeur et charge ressentie déclarées chaque semaine par les collaborateurs.'
            : 'Chaque semaine, deux questions pour dire comment ça va. Votre manager voit vos réponses.'
        }
      />
      {isManager ? <TeamWeather /> : <WeatherEntry />}
    </Page>
  );
}
