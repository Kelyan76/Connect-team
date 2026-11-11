import { CalendarPlus, Compass, FileDown, NotebookPen, PenLine, UserX, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FeedbackDialog } from '@/features/feedback/components/FeedbackDialog';
import { ObservationDialog } from '@/features/notebook/components/ObservationDialog';
import { NotebookList } from '@/features/notebook/components/NotebookList';
import { downloadPersonReport } from '@/features/reports/download';
import { formatDate, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { DescriptionList, Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { JourneyView } from '@/features/journey/components/JourneyView';
import { DiscCard } from '../components/DiscCard';
import { PersonOverview } from '../components/PersonOverview';
import { PersonFeedbacks, PersonObjectives, PersonReviews, PersonSkills } from '../components/PersonSections';
import { useSetActive, useTeamMembers } from '../queries';

export default function PersonPage() {
  const { id = '' } = useParams();
  const team = useTeamMembers();
  const setActive = useSetActive();
  const [confirm, setConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [noting, setNoting] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const person = team.byId.get(id);

  if (team.error) return <ErrorState error={team.error} />;
  if (team.isLoading) {
    return (
      <Page>
        <Skeleton className="h-16 w-80" />
        <Skeleton className="mt-6 h-80" />
      </Page>
    );
  }
  if (!person || person.role !== 'collaborateur') {
    return (
      <Page>
        <EmptyState title="Fiche introuvable" description="Ce collaborateur n’existe pas ou ne fait pas partie de votre équipe." action={<Link to="/equipe" className="text-sm text-accent hover:underline">Retour à l’équipe</Link>} />
      </Page>
    );
  }

  const exportPdf = async () => {
    setExporting(true);
    try {
      await downloadPersonReport(person.id);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Équipe' }, { label: 'Collaborateurs', to: '/equipe' }, { label: fullName(person) }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar person={person} size="lg" />
            <span className="flex flex-col">
              {fullName(person)}
              <span className="text-base font-normal text-fg-muted">{person.job_title}</span>
            </span>
            {!person.is_active && <Badge>Désactivé</Badge>}
          </span>
        }
        actions={
          <>
            <Button onClick={() => setNoting(true)}>
              <NotebookPen aria-hidden />
              Noter
            </Button>
            <Button onClick={() => setFeedback(true)}>
              <PenLine aria-hidden />
              Feedback
            </Button>
            <Button asChild>
              <Link to={`/posture?collaborateur=${person.id}`}>
                <Compass aria-hidden />
                Décider
              </Link>
            </Button>
            <Button className="hidden sm:inline-flex" onClick={() => setConfirm(true)}>
              {person.is_active ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
              {person.is_active ? 'Désactiver' : 'Réactiver'}
            </Button>
            <Button className="hidden sm:inline-flex" onClick={() => void exportPdf()} disabled={exporting}>
              <FileDown aria-hidden />
              {exporting ? 'Génération…' : 'Fiche PDF'}
            </Button>
            <Button asChild variant="primary">
              <Link to={`/entretiens?planifier=1&collaborateur=${person.id}`}>
                <CalendarPlus aria-hidden />
                Planifier un 1 à 1
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Tabs defaultValue="synthese" className="min-w-0">
          <TabsList>
            <TabsTrigger value="synthese">Où en est-il ?</TabsTrigger>
            <TabsTrigger value="parcours">Parcours</TabsTrigger>
            <TabsTrigger value="carnet">Carnet</TabsTrigger>
            <TabsTrigger value="disc">DISC</TabsTrigger>
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
            <TabsTrigger value="entretiens">1 à 1</TabsTrigger>
            <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
            <TabsTrigger value="competences">Compétences</TabsTrigger>
          </TabsList>
          <TabsContent value="synthese">
            <PersonOverview person={person} />
          </TabsContent>
          <TabsContent value="parcours">
            <JourneyView personId={person.id} self={false} />
          </TabsContent>
          <TabsContent value="carnet">
            <NotebookList personId={person.id} />
          </TabsContent>
          <TabsContent value="disc">
            <DiscCard personId={person.id} self={false} />
          </TabsContent>
          <TabsContent value="objectifs">
            <PersonObjectives personId={person.id} />
          </TabsContent>
          <TabsContent value="competences">
            <PersonSkills personId={person.id} />
          </TabsContent>
          <TabsContent value="entretiens">
            <PersonReviews personId={person.id} />
          </TabsContent>
          <TabsContent value="feedbacks">
            <PersonFeedbacks personId={person.id} />
          </TabsContent>
        </Tabs>
        <Panel title="Identité">
          <DescriptionList
            items={[
              { label: 'E-mail', value: <span className="break-all">{person.email}</span> },
              { label: 'Poste', value: person.job_title },
              { label: 'Arrivée', value: person.hired_on ? formatDate(person.hired_on) : '—' },
              { label: 'Rôle', value: 'Collaborateur' },
              { label: 'Compte', value: person.is_active ? 'Actif' : 'Désactivé' },
            ]}
          />
        </Panel>
      </div>
      <ObservationDialog open={noting} onOpenChange={setNoting} defaultPerson={person.id} />
      <FeedbackDialog open={feedback} onOpenChange={setFeedback} defaultPerson={person.id} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={person.is_active ? `Désactiver le compte de ${fullName(person)} ?` : `Réactiver le compte de ${fullName(person)} ?`}
        description={
          person.is_active
            ? 'Il ne pourra plus se connecter. Son historique (entretiens, objectifs, feedbacks) est conservé.'
            : 'Il pourra de nouveau se connecter avec son mot de passe actuel.'
        }
        confirmLabel={person.is_active ? 'Désactiver' : 'Réactiver'}
        destructive={person.is_active}
        pending={setActive.isPending}
        onConfirm={() => setActive.mutate({ id: person.id, active: !person.is_active }, { onSettled: () => setConfirm(false) })}
      />
    </Page>
  );
}
