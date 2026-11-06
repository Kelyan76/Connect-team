import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { todayIso } from '@/shared/lib/dates';
import { formatDate, fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import { ACTION_STATUS, useCreateMeeting, useDecisions, useMeetingActions, useMeetings } from '../queries';

export default function MeetingsPage() {
  const navigate = useNavigate();
  const { profile } = useCurrentUser();
  const meetings = useMeetings();
  const decisions = useDecisions();
  const actions = useMeetingActions();
  const team = useTeamMembers();
  const create = useCreateMeeting();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Point hebdomadaire opérations');
  const [date, setDate] = useState(todayIso());
  useHotkey('n', () => setOpen(true));
  const today = todayIso();
  const openActions = (actions.data ?? []).filter((a) => a.status !== 'fait');

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Organisation' }, { label: 'Réunions' }]}
        title="Réunions et décisions"
        description="Comptes-rendus, registre des décisions et plan d’action partagé."
        actions={
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus aria-hidden />
            Nouveau compte-rendu
          </Button>
        }
      />
      {meetings.error ? (
        <ErrorState error={meetings.error} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="Comptes-rendus" flush>
            {!meetings.data ? (
              <TableSkeleton rows={4} columns={3} />
            ) : meetings.data.length === 0 ? (
              <EmptyState title="Aucune réunion" description="Consignez ici vos réunions d’équipe et les décisions prises." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <Th align="right">Date</Th>
                    <Th>Réunion</Th>
                    <Th align="right">Participants</Th>
                    <Th align="right">Décisions</Th>
                  </tr>
                </THead>
                <TBody>
                  {meetings.data.map((m) => (
                    <Tr key={m.id} className="cursor-pointer" onClick={() => navigate(`/reunions/${m.id}`)}>
                      <Td numeric>{formatDate(m.held_on)}</Td>
                      <Td className="font-medium">{m.title}</Td>
                      <Td numeric>{m.participants.length}</Td>
                      <Td numeric>{(decisions.data ?? []).filter((d) => d.meeting_id === m.id).length}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Panel>
          <Panel title="Actions en cours" description={`${openActions.length} actions issues des réunions`} flush>
            <ul className="divide-y divide-line">
              {openActions.map((a) => {
                const owner = team.byId.get(a.owner_id);
                return (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">{a.title}</span>
                      <span className="text-xs text-fg-subtle">
                        {owner ? fullName(owner) : '—'} · {ACTION_STATUS[a.status]}
                      </span>
                    </span>
                    {a.due_date && <span className={`tabular shrink-0 text-xs ${a.due_date < today ? 'font-medium text-danger' : 'text-fg-subtle'}`}>{formatDate(a.due_date)}</span>}
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Registre des décisions" flush className="xl:col-span-2">
            <Table>
              <THead>
                <tr>
                  <Th align="right">Date</Th>
                  <Th>Décision</Th>
                  <Th>Réunion</Th>
                </tr>
              </THead>
              <TBody>
                {(decisions.data ?? [])
                  .slice()
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((d) => {
                    const m = meetings.data?.find((x) => x.id === d.meeting_id);
                    return (
                      <Tr key={d.id}>
                        <Td numeric>{m ? formatDate(m.held_on) : '—'}</Td>
                        <Td>
                          <span className="flex flex-col">
                            <span className="font-medium">{d.title}</span>
                            {d.details && <span className="text-xs text-fg-subtle">{d.details}</span>}
                          </span>
                        </Td>
                        <Td className="text-fg-muted">{m?.title}</Td>
                      </Tr>
                    );
                  })}
              </TBody>
            </Table>
          </Panel>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Nouveau compte-rendu"
          footer={
            <>
              <Button onClick={() => setOpen(false)}>Annuler</Button>
              <Button
                variant="primary"
                disabled={title.trim().length < 3 || create.isPending}
                onClick={() =>
                  create.mutate(
                    { title: title.trim(), held_on: date, participants: [profile.id, ...team.active.map((p) => p.id)] },
                    { onSuccess: (id) => { setOpen(false); if (typeof id === 'string') navigate(`/reunions/${id}`); } },
                  )
                }
              >
                Créer
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Intitulé">
              <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
