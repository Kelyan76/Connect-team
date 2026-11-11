import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { fullName } from '@/shared/lib/format';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader } from '@/shared/ui/layout';
import { JourneyView } from '../components/JourneyView';

/** « Mon parcours » (collaborateur) ; le manager choisit le collaborateur dont il consulte le parcours. */
export default function JourneyPage() {
  const { profile, isManager } = useCurrentUser();
  const team = useTeamMembers();
  const [params, setParams] = useSearchParams();
  const personId = isManager ? (params.get('collaborateur') ?? team.active[0]?.id ?? '') : profile.id;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon suivi' }, { label: isManager ? 'Parcours' : 'Mon parcours' }]}
        title={isManager ? 'Parcours' : 'Mon parcours'}
        description={
          isManager
            ? 'Les réussites de chaque collaborateur : utile pour reconnaître et préparer l’entretien annuel.'
            : 'Vos réussites au fil des mois : reconnaissances, missions, compétences et engagements tenus.'
        }
        actions={
          isManager && (
            <NativeSelect aria-label="Collaborateur" className="w-56" value={personId} onChange={(e) => setParams({ collaborateur: e.target.value }, { replace: true })}>
              {team.active.map((p) => (
                <option key={p.id} value={p.id}>
                  {fullName(p)}
                </option>
              ))}
            </NativeSelect>
          )
        }
      />
      {personId && <JourneyView key={personId} personId={personId} self={!isManager} />}
    </Page>
  );
}
