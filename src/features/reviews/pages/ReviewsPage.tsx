import { CalendarPlus, MessageSquarePlus, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { daysFromToday } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { ErrorState, TableSkeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { RegulatoryPanel } from '../components/RegulatoryPanel';
import { RequestDialog } from '../components/RequestDialog';
import { RequestsList } from '../components/RequestsList';
import { ReviewTable } from '../components/ReviewTable';
import { ScheduleDialog } from '../components/ScheduleDialog';
import { useReviewRequests, useReviews } from '../queries';

export default function ReviewsPage() {
  const { isManager } = useCurrentUser();
  const [params, setParams] = useSearchParams();
  const reviews = useReviews();
  const requests = useReviewRequests();
  const team = useTeamMembers();
  const [scheduling, setScheduling] = useState(params.get('planifier') === '1');
  const [requesting, setRequesting] = useState(params.get('demande') === '1');
  const [fromRequest, setFromRequest] = useState<{ id: string; collaboratorId: string; date: string | null } | null>(null);
  useHotkey('n', () => (isManager ? setScheduling(true) : setRequesting(true)));

  const all = reviews.data ?? [];
  const upcoming = all
    .filter((r) => r.status === 'planifie')
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const toSign = all.filter((r) => r.status === 'termine' && (!r.collaborator_signed_at || !r.manager_signed_at));
  const history = all.filter((r) => r.status !== 'planifie');
  const pending = (requests.data ?? []).filter((r) => r.status === 'en_attente');

  const closeSchedule = (open: boolean) => {
    setScheduling(open);
    if (!open) {
      setFromRequest(null);
      if (params.has('planifier')) setParams({}, { replace: true });
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon espace' }, { label: isManager ? 'Entretiens' : 'Mes entretiens' }]}
        title={isManager ? 'Entretiens' : 'Mes entretiens'}
        description={
          isManager
            ? '1 à 1, entretiens annuels et professionnels de l’équipe.'
            : 'Préparez vos entretiens, consultez vos comptes-rendus et demandez un 1 à 1.'
        }
        actions={
          isManager ? (
            <>
              <Button asChild>
                <Link to="/entretiens/trames">
                  <Settings2 aria-hidden />
                  Trames
                </Link>
              </Button>
              <Button variant="primary" onClick={() => setScheduling(true)}>
                <CalendarPlus aria-hidden />
                Planifier un entretien
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setRequesting(true)}>
              <MessageSquarePlus aria-hidden />
              Demander un 1 à 1
            </Button>
          )
        }
      />
      {reviews.error ? (
        <ErrorState error={reviews.error} onRetry={() => void reviews.refetch()} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs defaultValue="a-venir" className="min-w-0">
            <TabsList>
              <TabsTrigger value="a-venir">À venir · {upcoming.length}</TabsTrigger>
              <TabsTrigger value="a-signer">À signer · {toSign.length}</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
              <TabsTrigger value="demandes">Demandes · {pending.length}</TabsTrigger>
            </TabsList>
            {!reviews.data ? (
              <div className="rounded-lg border border-line bg-surface">
                <TableSkeleton />
              </div>
            ) : (
              <>
                <TabsContent value="a-venir">
                  <ReviewTable
                    reviews={upcoming}
                    byId={team.byId}
                    showPerson={isManager}
                    empty={isManager ? 'Aucun entretien planifié. Commencez par les 1 à 1 de l’équipe.' : 'Aucun entretien planifié pour le moment.'}
                    when={(r) => daysFromToday(r.scheduled_at.slice(0, 10))}
                  />
                </TabsContent>
                <TabsContent value="a-signer">
                  <ReviewTable reviews={toSign} byId={team.byId} showPerson={isManager} empty="Aucun compte-rendu en attente de signature." />
                </TabsContent>
                <TabsContent value="historique">
                  <ReviewTable reviews={history} byId={team.byId} showPerson={isManager} empty="Aucun entretien passé." />
                </TabsContent>
                <TabsContent value="demandes">
                  <RequestsList
                    requests={requests.data ?? []}
                    byId={team.byId}
                    isManager={isManager}
                    onAccept={(r) => {
                      setFromRequest({ id: r.id, collaboratorId: r.collaborator_id, date: r.preferred_date });
                      setScheduling(true);
                    }}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
          <RegulatoryPanel />
        </div>
      )}
      {isManager && (
        <ScheduleDialog
          open={scheduling}
          onOpenChange={closeSchedule}
          defaultCollaborator={fromRequest?.collaboratorId ?? params.get('collaborateur') ?? undefined}
          defaultDate={fromRequest?.date ?? undefined}
          requestId={fromRequest?.id}
        />
      )}
      {!isManager && <RequestDialog open={requesting} onOpenChange={setRequesting} />}
    </Page>
  );
}
