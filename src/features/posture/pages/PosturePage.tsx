import { useSearchParams } from 'react-router-dom';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { PostureWizard } from '../components/PostureWizard';
import { DIAGNOSES, scarfRisks, type Diagnosis, type Scarf } from '../lib/posture';
import { usePostureNotes } from '../queries';

/** « Quelle décision prendre et avec quelle posture ? » (question 4 du brief). */
export default function PosturePage() {
  const [params] = useSearchParams();
  const notes = usePostureNotes();
  const team = useTeamMembers();
  const person = params.get('collaborateur') ?? '';

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: '1 à 1 et feedback' }, { label: 'Décider' }]}
        title="Décider avec la bonne posture"
        description="Avant d’agir : les faits, le diagnostic Comprendre / Savoir / Pouvoir / Vouloir, l’effet de la décision (SCARF) et la forme adaptée au profil DISC."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PostureWizard key={person} initialPerson={person} />
        <Panel title="Journal de mes décisions" description="Privé : le collaborateur ne le voit pas." flush>
          {!notes.data?.length ? (
            <EmptyState title="Aucune décision" description="Vos décisions apparaîtront ici, pour en mesurer l’effet au 1 à 1 suivant." />
          ) : (
            <ul className="divide-y divide-line">
              {notes.data.map((n) => {
                const p = team.byId.get(n.collaborator_id);
                const risks = scarfRisks(n.scarf as Scarf);
                return (
                  <li key={n.id} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {p && <PersonLabel person={p} size="xs" />}
                      <Badge tone="accent">{DIAGNOSES[n.diagnosis as Diagnosis].label}</Badge>
                      <span className="text-xs text-fg-subtle">{formatDate(n.created_at)}</span>
                    </div>
                    <p className="text-sm text-fg-muted">{n.situation}</p>
                    {n.decision && <p className="text-sm">{n.decision}</p>}
                    {risks.length > 0 && <span className="text-xs text-warning">SCARF à surveiller : {risks.map((r) => r.label).join(', ')}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}
