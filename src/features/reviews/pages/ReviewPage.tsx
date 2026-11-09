import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { downloadReviewReport } from '@/features/reports/download';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, formatTime, fullName } from '@/shared/lib/format';
import { StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { reviewQuestions } from '../api';
import { ActionPlan } from '../components/ActionPlan';
import { AnswerForm } from '../components/AnswerForm';
import { CollaboratorTopics } from '../components/CollaboratorTopics';
import { KeyliaPrep } from '../components/KeyliaPrep';
import { QuickPrep } from '../components/QuickPrep';
import { OneToOneGuide } from '../components/OneToOneGuide';
import { MinutesPanel } from '../components/MinutesPanel';
import { PrepAssistant } from '../components/PrepAssistant';
import { SideBySide } from '../components/SideBySide';
import { Signatures } from '../components/Signatures';
import { canEditOwnAnswers, canSeeOtherSide, KIND_LABEL, PREP_META, prepStatus, reviewStage } from '../lib/review-rules';
import { useAnswers, useReview } from '../queries';

export default function ReviewPage() {
  const { id = '' } = useParams();
  const { isManager, profile } = useCurrentUser();
  const review = useReview(id);
  const answers = useAnswers(id);
  const team = useTeamMembers();
  const [exporting, setExporting] = useState(false);

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
  const person = team.byId.get(r.collaborator_id) ?? (r.collaborator_id === profile.id ? profile : undefined);
  const questions = reviewQuestions(r);
  const stage = reviewStage(r);
  const prep = PREP_META[prepStatus(r)];
  const sideBySide = canSeeOtherSide(viewer, r);
  const defaultTab = stage === 'preparation' && !sideBySide ? 'preparation' : stage === 'preparation' ? 'cote-a-cote' : 'compte-rendu';

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
        <EmptyState title="Trame vide" description="Cet entretien n’a pas de questions. Complétez la trame puis replanifiez-le." />
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
          stage !== 'preparation' ? (
            <Button onClick={() => void exportPdf()} disabled={exporting}>
              <FileDown aria-hidden />
              {exporting ? 'Génération…' : 'Export PDF'}
            </Button>
          ) : undefined
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Tabs defaultValue={defaultTab} className="min-w-0">
          <TabsList>
            {stage === 'preparation' && <TabsTrigger value="preparation">Ma préparation</TabsTrigger>}
            <TabsTrigger value="cote-a-cote">Vue côte à côte</TabsTrigger>
            <TabsTrigger value="compte-rendu">Compte-rendu</TabsTrigger>
          </TabsList>
          {stage === 'preparation' && (
            <TabsContent value="preparation" className="flex flex-col gap-6">
              {!isManager && r.kind === 'one_to_one' && (
                <QuickPrep review={r} answers={answers.data} managerName={team.byId.get(r.manager_id)?.first_name ?? 'votre manager'} />
              )}
              <AnswerForm review={r} questions={questions} answers={answers.data} author={viewer} editable={canEditOwnAnswers(viewer, r)} />
            </TabsContent>
          )}
          <TabsContent value="cote-a-cote">
            <SideBySide review={r} questions={questions} answers={answers.data} viewer={viewer} />
          </TabsContent>
          <TabsContent value="compte-rendu" className="flex flex-col gap-6">
            {isManager && r.kind === 'one_to_one' && <OneToOneGuide review={r} locked={!!r.manager_signed_at} />}
            {!isManager && r.priority && (
              <div className="rounded-lg border border-line bg-surface px-4 py-3 text-base">
                <span className="font-medium">Priorité d’ici le prochain 1 à 1 : </span>
                {r.priority}
              </div>
            )}
            <MinutesPanel review={r} isManager={isManager} />
            <ActionPlan review={r} isManager={isManager} />
            <Signatures review={r} viewer={viewer} />
          </TabsContent>
        </Tabs>
        <aside className="flex min-w-0 flex-col gap-6">
          {isManager ? (
            <>
              {r.kind === 'one_to_one' && stage === 'preparation' && (
                <>
                  <CollaboratorTopics review={r} answers={answers.data} firstName={person?.first_name ?? 'Le collaborateur'} />
                  <KeyliaPrep review={r} />
                </>
              )}
              <PrepAssistant review={r} />
            </>
          ) : (
            <ActionPlan review={r} isManager={false} previousOnly />
          )}
        </aside>
      </div>
    </Page>
  );
}
