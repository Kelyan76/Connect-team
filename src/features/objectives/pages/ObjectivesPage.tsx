import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { CollapsibleFilters, Page, PageHeader, Toolbar } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { ObjectiveCard } from '../components/ObjectiveCard';
import { ObjectiveDialog } from '../components/ObjectiveDialog';
import { OBJECTIVE_STATUS, type ObjectiveStatus } from '../lib/status';
import { useObjectives } from '../queries';

export default function ObjectivesPage() {
  const { isManager } = useCurrentUser();
  const objectives = useObjectives();
  const team = useTeamMembers();
  const [scope, setScope] = useState('tous');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  useHotkey('n', () => isManager && setCreating(true));

  const list = (objectives.data ?? [])
    .filter((o) => scope === 'tous' || o.scope === scope)
    .filter((o) => !owner || o.owner_id === owner)
    .filter((o) => !status || o.status === status);
  const pending = (objectives.data ?? []).reduce((n, o) => n + o.pending, 0);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon espace' }, { label: isManager ? 'Objectifs' : 'Mes objectifs' }]}
        title={isManager ? 'Objectifs' : 'Mes objectifs'}
        description={
          isManager
            ? pending > 0
              ? `${pending} mise${pending > 1 ? 's' : ''} à jour d’avancement en attente de votre validation.`
              : 'Objectifs d’équipe et individuels.'
            : 'Mettez à jour vos résultats clés, votre manager valide.'
        }
        actions={
          isManager && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Nouvel objectif
            </Button>
          )
        }
      />
      <Toolbar>
        <Segmented value={scope} onValueChange={setScope} aria-label="Type d’objectif">
          <SegmentedItem value="tous">Tous</SegmentedItem>
          <SegmentedItem value="equipe">Équipe</SegmentedItem>
          <SegmentedItem value="individuel">Individuels</SegmentedItem>
        </Segmented>
        <CollapsibleFilters active={(owner ? 1 : 0) + (status ? 1 : 0)}>
          {isManager && (
            <NativeSelect aria-label="Filtrer par collaborateur" className="sm:w-56" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="">Tous les collaborateurs</option>
              {team.active.map((p) => (
                <option key={p.id} value={p.id}>
                  {fullName(p)}
                </option>
              ))}
            </NativeSelect>
          )}
          <NativeSelect aria-label="Filtrer par statut" className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {(Object.keys(OBJECTIVE_STATUS) as ObjectiveStatus[]).map((s) => (
              <option key={s} value={s}>
                {OBJECTIVE_STATUS[s].label}
              </option>
            ))}
          </NativeSelect>
        </CollapsibleFilters>
      </Toolbar>
      {objectives.data && list.length > 0 && (
        <p className="pb-3 text-sm text-fg-subtle">
          {list.length} objectif{list.length > 1 ? 's' : ''} · touchez un objectif pour voir ses résultats clés
        </p>
      )}
      {objectives.error ? (
        <ErrorState error={objectives.error} onRetry={() => void objectives.refetch()} />
      ) : !objectives.data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title="Aucun objectif ne correspond"
            description={isManager ? 'Modifiez les filtres ou créez un objectif avec ses résultats clés.' : 'Aucun objectif ne vous est encore assigné.'}
            action={isManager ? <Button onClick={() => setCreating(true)}>Nouvel objectif</Button> : undefined}
          />
        </div>
      ) : (
        <div className="stagger flex flex-col gap-3">
          {list.map((o) => (
            <ObjectiveCard key={o.id} objective={o} owner={o.owner_id ? team.byId.get(o.owner_id) : undefined} />
          ))}
        </div>
      )}
      {isManager && <ObjectiveDialog open={creating} onOpenChange={setCreating} />}
    </Page>
  );
}
