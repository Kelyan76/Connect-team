import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { Button } from '@/shared/ui/button';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { DelegationMatrix } from '../components/DelegationMatrix';
import { MissionDialog } from '../components/MissionDialog';
import { MissionList } from '../components/MissionList';
import type { Mission } from '../queries';

/** Délégation : missions confiées (processus du cours) et matrice des décisions. */
export default function DelegationPage() {
  const { isManager } = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('missions');
  const [editing, setEditing] = useState<Mission | null>(null);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<string | undefined>();

  useEffect(() => {
    if (!isManager || params.get('nouveau') !== '1') return;
    setPreset(params.get('collaborateur') ?? undefined);
    setEditing(null);
    setOpen(true);
    setParams({}, { replace: true });
  }, [isManager, params, setParams]);

  const startNew = () => {
    setEditing(null);
    setPreset(undefined);
    setOpen(true);
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Objectifs' : 'Mon espace' }, { label: 'Délégation' }]}
        title={isManager ? 'Déléguer pour faire grandir' : 'Mes missions et mon autonomie'}
        description={
          isManager
            ? 'Confier une mission avec ses limites, son échéance et ses points de contrôle, puis en faire le bilan et déléguer à nouveau.'
            : 'Les missions que votre manager vous a confiées et votre niveau d’autonomie par type de décision.'
        }
        actions={
          isManager && (
            <Button variant="primary" onClick={startNew}>
              <Plus aria-hidden />
              Confier une mission
            </Button>
          )
        }
      />
      <Segmented value={view} onValueChange={setView} aria-label="Vue" className="mb-6">
        <SegmentedItem value="missions">Missions confiées</SegmentedItem>
        <SegmentedItem value="matrice">Matrice des décisions</SegmentedItem>
      </Segmented>
      {view === 'missions' ? (
        <MissionList
          isManager={isManager}
          onNew={startNew}
          onEdit={(m) => {
            setEditing(m);
            setOpen(true);
          }}
        />
      ) : (
        <DelegationMatrix />
      )}
      {isManager && <MissionDialog open={open} onOpenChange={setOpen} mission={editing} defaultPerson={preset} />}
    </Page>
  );
}
