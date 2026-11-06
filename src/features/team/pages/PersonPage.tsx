import { CalendarPlus, FileDown, UserX, UserCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { downloadPersonReport } from '@/features/reports/download';
import { formatDate, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { DescriptionList, Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { PrivateNotes } from '../components/PrivateNotes';
import { PersonFeedbacks, PersonObjectives, PersonReviews, PersonSkills } from '../components/PersonSections';
import { useSetActive, useTeamMembers } from '../queries';

export default function PersonPage() {
  const { id = '' } = useParams();
  const { profile: me } = useCurrentUser();
  const team = useTeamMembers();
  const setActive = useSetActive();
  const [confirm, setConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
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
            <Button onClick={() => setConfirm(true)}>
              {person.is_active ? <UserX aria-hidden /> : <UserCheck aria-hidden />}
              {person.is_active ? 'Désactiver' : 'Réactiver'}
            </Button>
            <Button onClick={() => void exportPdf()} disabled={exporting}>
              <FileDown aria-hidden />
              {exporting ? 'Génération…' : 'Fiche PDF'}
            </Button>
            <Button asChild variant="primary">
              <Link to={`/entretiens?planifier=1&collaborateur=${person.id}`}>
                <CalendarPlus aria-hidden />
                Planifier un entretien
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Tabs defaultValue="objectifs" className="min-w-0">
          <TabsList>
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
            <TabsTrigger value="competences">Compétences</TabsTrigger>
            <TabsTrigger value="entretiens">Entretiens</TabsTrigger>
            <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
            <TabsTrigger value="notes">Notes privées</TabsTrigger>
          </TabsList>
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
          <TabsContent value="notes">
            <PrivateNotes personId={person.id} authorId={me.id} />
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
