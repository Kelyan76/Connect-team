import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTeamMembers } from '@/features/team/queries';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { todayIso } from '@/shared/lib/dates';
import { formatDate, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { ACTION_STATUS, useAddDecision, useAddMeetingAction, useDecisions, useMeetingActions, useMeetings, useSetMeetingActionStatus, useUpdateMeeting, type ActionStatus } from '../queries';

export default function MeetingPage() {
  const { id = '' } = useParams();
  const { profile } = useCurrentUser();
  const meetings = useMeetings();
  const decisions = useDecisions();
  const actions = useMeetingActions();
  const team = useTeamMembers();
  const update = useUpdateMeeting();
  const addDecision = useAddDecision();
  const addAction = useAddMeetingAction();
  const setStatus = useSetMeetingActionStatus();
  const meeting = meetings.data?.find((m) => m.id === id);
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState('');
  const [action, setAction] = useState({ title: '', owner: '', due: '' });
  useEffect(() => setNotes(meeting?.notes ?? ''), [meeting?.notes]);

  if (!meetings.data) return <Page><Skeleton className="h-96" /></Page>;
  if (!meeting) return <Page><EmptyState title="Réunion introuvable" description="Ce compte-rendu n’existe pas ou a été supprimé." /></Page>;
  const people = [profile, ...team.active];
  const name = (pid: string) => {
    const p = people.find((x) => x.id === pid);
    return p ? fullName(p) : '—';
  };
  const mine = (actions.data ?? []).filter((a) => a.meeting_id === id);
  const today = todayIso();

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Organisation' }, { label: 'Réunions', to: '/reunions' }, { label: formatDate(meeting.held_on) }]}
        title={meeting.title}
        meta={
          <div className="flex items-center gap-2 text-sm text-fg-muted">
            {formatDate(meeting.held_on)} · {meeting.participants.length} participants
            <span className="ml-2 flex -space-x-1">
              {meeting.participants.slice(0, 8).map((pid) => {
                const p = people.find((x) => x.id === pid);
                return p ? <Avatar key={pid} person={p} size="xs" className="ring-2 ring-canvas" /> : null;
              })}
            </span>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Compte-rendu" description="Enregistrement à la sortie du champ">
          <Textarea aria-label="Compte-rendu" rows={14} maxLength={20000} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== meeting.notes && update.mutate({ id, patch: { notes } })} />
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Décisions" flush>
            <ul className="divide-y divide-line">
              {(decisions.data ?? []).filter((d) => d.meeting_id === id).map((d) => (
                <li key={d.id} className="flex flex-col px-4 py-2">
                  <span className="text-sm font-medium">{d.title}</span>
                  {d.details && <span className="text-xs text-fg-subtle">{d.details}</span>}
                </li>
              ))}
            </ul>
            <form className="flex gap-2 border-t border-line p-4" onSubmit={(e) => { e.preventDefault(); if (decision.trim().length >= 3) addDecision.mutate({ meeting_id: id, title: decision.trim() }, { onSuccess: () => setDecision('') }); }}>
              <Input aria-label="Nouvelle décision" placeholder="Nouvelle décision" value={decision} maxLength={200} onChange={(e) => setDecision(e.target.value)} />
              <Button type="submit" disabled={decision.trim().length < 3}>
                <Plus aria-hidden />
                Ajouter
              </Button>
            </form>
          </Panel>
          <Panel title="Plan d’action" flush>
            <ul className="divide-y divide-line">
              {mine.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm">{a.title}</span>
                    <span className={`text-xs ${a.status !== 'fait' && a.due_date && a.due_date < today ? 'text-danger' : 'text-fg-subtle'}`}>
                      {name(a.owner_id)}{a.due_date ? ` · ${formatDate(a.due_date)}` : ''}
                    </span>
                  </span>
                  <NativeSelect aria-label={`Statut de ${a.title}`} className="w-28" value={a.status} onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value as ActionStatus })}>
                    {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((s) => <option key={s} value={s}>{ACTION_STATUS[s]}</option>)}
                  </NativeSelect>
                </li>
              ))}
            </ul>
            <form
              className="grid gap-2 border-t border-line p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (action.title.trim().length < 3 || !action.owner) return;
                addAction.mutate({ meeting_id: id, title: action.title.trim(), owner_id: action.owner, due_date: action.due || null }, { onSuccess: () => setAction({ title: '', owner: '', due: '' }) });
              }}
            >
              <Field label="Action" className="sm:col-span-2">
                <Input value={action.title} maxLength={200} onChange={(e) => setAction({ ...action, title: e.target.value })} />
              </Field>
              <Field label="Responsable">
                <NativeSelect value={action.owner} onChange={(e) => setAction({ ...action, owner: e.target.value })}>
                  <option value="">Choisir…</option>
                  {people.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Échéance">
                <Input type="date" value={action.due} onChange={(e) => setAction({ ...action, due: e.target.value })} />
              </Field>
              <Button type="submit" className="sm:col-span-2" disabled={action.title.trim().length < 3 || !action.owner}>
                <Plus aria-hidden />
                Ajouter l’action
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
