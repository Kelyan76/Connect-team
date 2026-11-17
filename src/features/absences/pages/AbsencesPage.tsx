import { CalendarPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useSettings } from '@/features/settings/queries';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { Button } from '@/shared/ui/button';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { AbsenceList } from '../components/AbsenceList';
import { MonthCalendar } from '../components/MonthCalendar';
import { RequestAbsenceDialog } from '../components/RequestAbsenceDialog';
import { TeamCalendar } from '../components/TeamCalendar';
import { useAbsences } from '../queries';

type View = 'mois' | 'planning' | 'demandes';

/** Calendrier des congés : le collaborateur pose ses dates sur le mois, le manager voit l'équipe et valide. */
export default function AbsencesPage() {
  const { isManager, profile } = useCurrentUser();
  const absences = useAbsences();
  const team = useTeamMembers();
  const settings = useSettings();
  const [params, setParams] = useSearchParams();
  const [requesting, setRequesting] = useState(false);
  const [range, setRange] = useState<{ start: string; end: string } | undefined>();
  const [view, setView] = useState<View>('mois');
  useHotkey('n', () => !isManager && setRequesting(true));

  // Lien « Poser un congé » (actions rapides) : ouvre directement la demande.
  useEffect(() => {
    if (isManager || params.get('nouveau') !== '1') return;
    setRange(undefined);
    setRequesting(true);
    setParams({}, { replace: true });
  }, [isManager, params, setParams]);

  const mine = (absences.data ?? []).filter((a) => a.collaborator_id === profile.id);
  const pending = (absences.data ?? []).filter((a) => a.status === 'en_attente');
  const byId = new Map(team.byId);
  if (!byId.has(profile.id)) byId.set(profile.id, profile);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: isManager ? 'Organisation' : 'Mon espace' },
          { label: isManager ? 'Calendrier' : 'Mon calendrier' },
        ]}
        title={isManager ? 'Calendrier des congés' : 'Mes congés'}
        description={
          isManager
            ? `${pending.length} demande${pending.length > 1 ? 's' : ''} en attente. Les jours où plus de ${settings.data?.max_absent ?? 2} personnes sont absentes sont signalés en rouge.`
            : 'Posez vos dates directement sur le calendrier : votre manager valide ou refuse.'
        }
        actions={
          !isManager && (
            <Button
              variant="primary"
              onClick={() => {
                setRange(undefined);
                setRequesting(true);
              }}
            >
              <CalendarPlus aria-hidden />
              Poser un congé
            </Button>
          )
        }
      />
      {absences.error ? (
        <ErrorState error={absences.error} onRetry={() => void absences.refetch()} />
      ) : !absences.data || !settings.data ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented
              value={view}
              onValueChange={(v) => setView(v as View)}
              aria-label="Affichage"
            >
              <SegmentedItem value="mois">Calendrier</SegmentedItem>
              {isManager && <SegmentedItem value="planning">Planning d’équipe</SegmentedItem>}
              <SegmentedItem value="demandes">
                {isManager
                  ? `Demandes${pending.length ? ` (${pending.length})` : ''}`
                  : 'Mes demandes'}
              </SegmentedItem>
            </Segmented>
          </div>
          {view === 'mois' && (
            <MonthCalendar
              absences={isManager ? absences.data : mine}
              byId={byId}
              maxAbsent={isManager ? settings.data.max_absent : undefined}
              onPick={
                isManager
                  ? undefined
                  : (start, end) => {
                      setRange({ start, end });
                      setRequesting(true);
                    }
              }
            />
          )}
          {view === 'planning' && isManager && (
            <TeamCalendar
              absences={absences.data}
              people={team.active}
              maxAbsent={settings.data.max_absent}
            />
          )}
          {view === 'demandes' && (
            <AbsenceList
              absences={isManager ? absences.data : mine}
              byId={team.byId}
              isManager={isManager}
            />
          )}
        </div>
      )}
      {!isManager && (
        <RequestAbsenceDialog open={requesting} onOpenChange={setRequesting} range={range} />
      )}
    </Page>
  );
}
