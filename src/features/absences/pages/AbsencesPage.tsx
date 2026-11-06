import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useSettings } from '@/features/settings/queries';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { Button } from '@/shared/ui/button';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { AbsenceList } from '../components/AbsenceList';
import { RequestAbsenceDialog } from '../components/RequestAbsenceDialog';
import { TeamCalendar } from '../components/TeamCalendar';
import { useAbsences } from '../queries';

export default function AbsencesPage() {
  const { isManager, profile } = useCurrentUser();
  const absences = useAbsences();
  const team = useTeamMembers();
  const settings = useSettings();
  const [requesting, setRequesting] = useState(false);
  useHotkey('n', () => !isManager && setRequesting(true));

  const pending = (absences.data ?? []).filter((a) => a.status === 'en_attente');
  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Organisation' : 'Mon espace' }, { label: isManager ? 'Absences' : 'Mes absences' }]}
        title={isManager ? 'Absences et congés' : 'Mes absences'}
        description={
          isManager
            ? `${pending.length} demande${pending.length > 1 ? 's' : ''} en attente. Les jours où plus de ${settings.data?.max_absent ?? 2} personnes sont absentes sont signalés en rouge.`
            : 'Demandez un congé : votre manager le valide ou le refuse.'
        }
        actions={
          !isManager && (
            <Button variant="primary" onClick={() => setRequesting(true)}>
              <CalendarPlus aria-hidden />
              Demander un congé
            </Button>
          )
        }
      />
      {absences.error ? (
        <ErrorState error={absences.error} onRetry={() => void absences.refetch()} />
      ) : !absences.data || !settings.data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex flex-col gap-6">
          {isManager && <TeamCalendar absences={absences.data} people={team.active} maxAbsent={settings.data.max_absent} />}
          <AbsenceList
            absences={isManager ? absences.data : absences.data.filter((a) => a.collaborator_id === profile.id)}
            byId={team.byId}
            isManager={isManager}
          />
        </div>
      )}
      {!isManager && <RequestAbsenceDialog open={requesting} onOpenChange={setRequesting} />}
    </Page>
  );
}
