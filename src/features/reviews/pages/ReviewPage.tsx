import { FileDown, Mic, Trash2, Video } from 'lucide-react';
import { lazy, Suspense, useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { downloadReviewReport } from '@/features/reports/download';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, formatTime, fullName } from '@/shared/lib/format';
import { StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { reviewQuestions } from '../api';
import { ActionPlan } from '../components/ActionPlan';
import { AnswerForm } from '../components/AnswerForm';
import { CollaboratorTopics } from '../components/CollaboratorTopics';
import { ManagerPrep } from '../components/ManagerPrep';
import { QuickPrep } from '../components/QuickPrep';
import { OneToOneGuide } from '../components/OneToOneGuide';
import { EchoRecorder } from '../components/EchoRecorder';
import { GuideFold } from '../components/GuideFold';
import { MinutesPanel } from '../components/MinutesPanel';
import { PrepAssistant } from '../components/PrepAssistant';
import { SideBySide } from '../components/SideBySide';
import { Signatures } from '../components/Signatures';
import {
  canEditOwnAnswers,
  canSeeOtherSide,
  KIND_LABEL,
  PREP_META,
  prepStatus,
  reviewStage,
} from '../lib/review-rules';
import { useAnswers, useDeleteReview, useReview } from '../queries';

// Visio (LiveKit) chargée seulement quand on clique sur « Visio ».
const VideoCall = lazy(() => import('../components/VideoCall'));

export default function ReviewPage() {
  const { id = '' } = useParams();
  const { isManager, profile } = useCurrentUser();
  const review = useReview(id);
  const answers = useAnswers(id);
  const team = useTeamMembers();
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Visio : ouverte depuis le bouton, ou directement depuis la notification « … vous attend en visio ».
  const [params] = useSearchParams();
  const [inCall, setInCall] = useState(params.get('visio') === '1');
  const leaveCall = useCallback(() => setInCall(false), []);
  const remove = useDeleteReview();
  const navigate = useNavigate();

  if (review.error) {
    return (
      <Page>
        <ErrorState error={review.error} />
        <Link to="/entretiens" className="ml-5 text-sm text-accent hover:underline">
          Retour aux entretiens
        </Link>
      </Page>
    );
  }
  if (!review.data || !answers.data) {
    return (
      <Page>
        <Skeleton className="h-12 w-96" />
        <Skeleton className="mt-6 h-96" />
      </Page>
    );
  }

  const r = review.data;
  const viewer = isManager ? 'manager' : 'collaborateur';
  const person =
    team.byId.get(r.collaborator_id) ?? (r.collaborator_id === profile.id ? profile : undefined);
  const questions = reviewQuestions(r);
  const stage = reviewStage(r);
  const prep = PREP_META[prepStatus(r)];
  const sideBySide = canSeeOtherSide(viewer, r);
  const defaultTab =
    stage === 'preparation' && !sideBySide
      ? 'preparation'
      : stage === 'preparation'
        ? 'cote-a-cote'
        : 'compte-rendu';
  const canRecord = isManager && r.kind === 'one_to_one' && !r.manager_signed_at;
  const canCall = r.status === 'planifie';
  const currentTab = tab ?? defaultTab;
  // Manager en préparation : tout est dans les 3 étapes, pas de colonne à droite.
  const showAside = !(isManager && stage === 'preparation' && currentTab === 'preparation');
  const openEcho = () => {
    setTab('compte-rendu');
    window.setTimeout(
      () => document.getElementById('echo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    );
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadReviewReport(r.id);
    } finally {
      setExporting(false);
    }
  };

  if (questions.length === 0 && stage === 'preparation') {
    return (
      <Page>
        <EmptyState
          title="Trame vide"
          description="Cet entretien n’a pas de questions. Complétez la trame puis replanifiez-le."
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: isManager ? 'Équipe' : 'Mon espace' },
          { label: isManager ? 'Entretiens' : 'Mes entretiens', to: '/entretiens' },
          { label: KIND_LABEL[r.kind] },
        ]}
        title={`${KIND_LABEL[r.kind]}${isManager && person ? ` · ${fullName(person)}` : ''}`}
        meta={
          <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
            <span>
              {formatDate(r.scheduled_at)} à {formatTime(r.scheduled_at)} · {r.duration_minutes} min
              {r.location ? ` · ${r.location}` : ''}
            </span>
            {stage === 'preparation' && <StatusDot tone={prep.tone}>{prep.label}</StatusDot>}
          </div>
        }
        actions={
          isManager || canCall || stage !== 'preparation' ? (
            <div className="flex flex-wrap gap-2">
              {canCall && !inCall && (
                <Button variant="primary" onClick={() => setInCall(true)}>
                  <Video aria-hidden />
                  Visio
                </Button>
              )}
              {canRecord && (
                <Button onClick={openEcho}>
                  <Mic aria-hidden />
                  Enregistrer avec Echo
                </Button>
              )}
              {stage !== 'preparation' && (
                <Button onClick={() => void exportPdf()} disabled={exporting}>
                  <FileDown aria-hidden />
                  {exporting ? 'Génération…' : 'Export PDF'}
                </Button>
              )}
              {isManager && (
                <Button
                  variant="ghost"
                  className="text-danger hover:text-danger"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 aria-hidden />
                  Supprimer
                </Button>
              )}
            </div>
          ) : undefined
        }
      />
      {inCall && canCall && (
        <Suspense fallback={<Skeleton className="mb-6 h-[60vh] rounded-lg" />}>
          <VideoCall reviewId={r.id} onClose={leaveCall} />
        </Suspense>
      )}
      <div
        className={
          showAside ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]' : 'flex flex-col gap-6'
        }
      >
        <Tabs value={currentTab} onValueChange={setTab} className="min-w-0">
          <TabsList>
            {stage === 'preparation' && (
              <TabsTrigger value="preparation">
                {isManager ? 'Préparer' : 'Ma préparation'}
              </TabsTrigger>
            )}
            <TabsTrigger value="cote-a-cote">Vue côte à côte</TabsTrigger>
            <TabsTrigger value="compte-rendu">Compte-rendu</TabsTrigger>
          </TabsList>
          {stage === 'preparation' && (
            <TabsContent value="preparation" className="flex flex-col gap-6">
              {!isManager && r.kind === 'one_to_one' && (
                <QuickPrep
                  review={r}
                  answers={answers.data}
                  managerName={team.byId.get(r.manager_id)?.first_name ?? 'votre manager'}
                />
              )}
              {isManager ? (
                <ManagerPrep
                  review={r}
                  questions={questions}
                  answers={answers.data}
                  firstName={person?.first_name ?? 'le collaborateur'}
                />
              ) : (
                <AnswerForm
                  review={r}
                  questions={questions}
                  answers={answers.data}
                  author={viewer}
                  editable={canEditOwnAnswers(viewer, r)}
                />
              )}
            </TabsContent>
          )}
          <TabsContent value="cote-a-cote">
            <SideBySide review={r} questions={questions} answers={answers.data} viewer={viewer} />
          </TabsContent>
          <TabsContent value="compte-rendu" className="flex flex-col gap-6">
            {isManager && r.kind === 'one_to_one' && (
              <GuideFold>
                <OneToOneGuide review={r} locked={!!r.manager_signed_at} />
              </GuideFold>
            )}
            {!isManager && r.priority && (
              <div className="rounded-lg border border-line bg-surface px-4 py-3 text-base">
                <span className="font-medium">Priorité d’ici le prochain 1 à 1 : </span>
                {r.priority}
              </div>
            )}
            {canRecord && (
              <div id="echo" className="scroll-mt-24">
                <EchoRecorder review={r} />
              </div>
            )}
            <ActionPlan review={r} isManager={isManager} />
            <MinutesPanel review={r} isManager={isManager} />
            <Signatures review={r} viewer={viewer} />
          </TabsContent>
        </Tabs>
        {showAside && (
          <aside className="flex min-w-0 flex-col gap-6">
            {isManager ? (
              <>
                {r.kind === 'one_to_one' && stage === 'preparation' && (
                  <CollaboratorTopics
                    review={r}
                    answers={answers.data}
                    firstName={person?.first_name ?? 'Le collaborateur'}
                  />
                )}
                <PrepAssistant review={r} />
              </>
            ) : (
              <ActionPlan review={r} isManager={false} previousOnly />
            )}
          </aside>
        )}
      </div>
      {isManager && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title="Supprimer ce 1 à 1 ?"
          description={`L’entretien${person ? ` avec ${person.first_name}` : ''}, ses réponses, sa préparation et son plan d’action seront définitivement supprimés.`}
          confirmLabel="Supprimer"
          pending={remove.isPending}
          onConfirm={() =>
            remove.mutate(r.id, {
              onSuccess: () => {
                setDeleting(false);
                navigate('/entretiens', { replace: true });
              },
            })
          }
        />
      )}
    </Page>
  );
}
