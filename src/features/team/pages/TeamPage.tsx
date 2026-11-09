import { LayoutGrid, List, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useObjectives } from '@/features/objectives/queries';
import { useReviews } from '@/features/reviews/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { useSort } from '@/shared/hooks/use-sort';
import { formatDate, formatPercent, fullName } from '@/shared/lib/format';
import { Avatar, PersonLabel } from '@/shared/ui/avatar';
import { Badge, StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/data';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Toolbar } from '@/shared/ui/layout';
import { SortableTh, Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { DemoAccountsPanel } from '../components/DemoAccountsPanel';
import { InviteDialog } from '../components/InviteDialog';
import { useTeamMembers } from '../queries';

export default function TeamPage() {
  const navigate = useNavigate();
  const team = useTeamMembers();
  const objectives = useObjectives();
  const reviews = useReviews();
  const [view, setView] = useState('tableau');
  const [job, setJob] = useState('');
  const [status, setStatus] = useState('actifs');
  const [inviting, setInviting] = useState(false);
  useHotkey('n', () => setInviting(true));

  const rows = useMemo(
    () =>
      team.members
        .filter((p) => (status === 'actifs' ? p.is_active : status === 'inactifs' ? !p.is_active : true))
        .filter((p) => !job || p.job_title === job)
        .map((p) => {
          const mine = (objectives.data ?? []).filter((o) => o.owner_id === p.id);
          const progress = mine.length ? mine.reduce((s, o) => s + o.progress, 0) / mine.length : null;
          const last = (reviews.data ?? []).find((r) => r.collaborator_id === p.id && r.kind === 'one_to_one' && r.status === 'termine');
          return { person: p, progress, lastOneToOne: last?.scheduled_at ?? null };
        }),
    [team.members, objectives.data, reviews.data, job, status],
  );
  const jobs = [...new Set(team.members.map((p) => p.job_title))].sort();

  const { sorted, sort, toggle } = useSort(
    rows,
    {
      name: (r) => r.person.last_name,
      job: (r) => r.person.job_title,
      hired: (r) => r.person.hired_on,
      progress: (r) => r.progress,
      last: (r) => r.lastOneToOne,
    },
    { key: 'name', direction: 'asc' },
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Équipe' }, { label: 'Collaborateurs' }]}
        title="Collaborateurs"
        description={`${team.active.length} collaborateurs actifs dans l’équipe.`}
        actions={
          <Button variant="primary" onClick={() => setInviting(true)}>
            <UserPlus aria-hidden />
            Inviter un collaborateur
          </Button>
        }
      />
      <Toolbar>
        <NativeSelect aria-label="Filtrer par poste" value={job} onChange={(e) => setJob(e.target.value)} className="w-64">
          <option value="">Tous les postes</option>
          {jobs.map((j) => (
            <option key={j}>{j}</option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filtrer par statut" value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
          <option value="actifs">Actifs</option>
          <option value="inactifs">Désactivés</option>
          <option value="tous">Tous</option>
        </NativeSelect>
        <Segmented value={view} onValueChange={setView} aria-label="Affichage" className="ml-auto">
          <SegmentedItem value="tableau" aria-label="Tableau">
            <List aria-hidden />
            Tableau
          </SegmentedItem>
          <SegmentedItem value="cartes" aria-label="Cartes">
            <LayoutGrid aria-hidden />
            Cartes
          </SegmentedItem>
        </Segmented>
      </Toolbar>

      {team.error ? (
        <ErrorState error={team.error} onRetry={() => void team.refetch()} />
      ) : team.isLoading ? (
        <div className="rounded-lg border border-line bg-surface">
          <TableSkeleton />
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            title="Aucun collaborateur ne correspond"
            description="Modifiez les filtres, ou invitez un nouveau collaborateur : il recevra un e-mail pour définir son mot de passe."
            action={<Button onClick={() => setInviting(true)}>Inviter un collaborateur</Button>}
          />
        </div>
      ) : view === 'cartes' ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sorted.map(({ person, progress, lastOneToOne }) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => navigate(`/equipe/${person.id}`)}
                className="flex w-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
              >
                <div className="flex items-center gap-3">
                  <Avatar person={person} size="lg" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-base font-medium">{fullName(person)}</span>
                    <span className="truncate text-xs text-fg-subtle">{person.job_title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={progress ?? 0} label="Avancement des objectifs" />
                  <span className="tabular w-10 text-right text-sm">{progress === null ? '—' : formatPercent(progress)}</span>
                </div>
                <span className="text-xs text-fg-subtle">
                  Dernier 1 à 1 : {lastOneToOne ? formatDate(lastOneToOne) : 'aucun'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-line bg-surface">
          <Table>
            <THead>
              <tr>
                <SortableTh label="Collaborateur" sortKey="name" sort={sort} onSort={toggle} />
                <SortableTh label="Poste" sortKey="job" sort={sort} onSort={toggle} />
                <SortableTh label="Arrivée" sortKey="hired" sort={sort} onSort={toggle} align="right" />
                <SortableTh label="Objectifs" sortKey="progress" sort={sort} onSort={toggle} align="right" />
                <SortableTh label="Dernier 1 à 1" sortKey="last" sort={sort} onSort={toggle} align="right" />
                <Th>Compte</Th>
              </tr>
            </THead>
            <TBody>
              {sorted.map(({ person, progress, lastOneToOne }) => (
                <Tr key={person.id} className="cursor-pointer" onClick={() => navigate(`/equipe/${person.id}`)}>
                  <Td>
                    <PersonLabel person={person} detail={person.email} />
                  </Td>
                  <Td className="text-fg-muted">{person.job_title}</Td>
                  <Td numeric>{person.hired_on ? formatDate(person.hired_on) : '—'}</Td>
                  <Td numeric>
                    <div className="ml-auto flex w-36 items-center gap-3">
                      <ProgressBar value={progress ?? 0} label="Avancement des objectifs" />
                      <span className="w-10 text-right">{progress === null ? '—' : formatPercent(progress)}</span>
                    </div>
                  </Td>
                  <Td numeric>{lastOneToOne ? formatDate(lastOneToOne) : '—'}</Td>
                  <Td>{person.is_active ? <StatusDot tone="success">Actif</StatusDot> : <Badge>Désactivé</Badge>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
      <DemoAccountsPanel />
      <InviteDialog open={inviting} onOpenChange={setInviting} />
    </Page>
  );
}
