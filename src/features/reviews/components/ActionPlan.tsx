import { Plus } from 'lucide-react';
import { useState } from 'react';
import { ACTION_STATUS, type ActionStatus } from '@/features/meetings/queries';
import { useTeamMembers } from '@/features/team/queries';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { todayIso } from '@/shared/lib/dates';
import { formatDate, fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { Input, NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import type { Review, ReviewAction } from '../api';
import { useAddAction, useReviewActions, useReviews, useSetActionStatus } from '../queries';

/** Plan d'action de l'entretien, et suivi automatique des actions des entretiens précédents. */
export function ActionPlan({ review, isManager, previousOnly = false }: { review: Review; isManager: boolean; previousOnly?: boolean }) {
  const { profile } = useCurrentUser();
  const actions = useReviewActions();
  const reviews = useReviews();
  const team = useTeamMembers();
  const add = useAddAction();
  const setStatus = useSetActionStatus();
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState(review.collaborator_id);
  const [due, setDue] = useState('');

  const earlier = new Set(
    (reviews.data ?? []).filter((r) => r.collaborator_id === review.collaborator_id && r.scheduled_at < review.scheduled_at).map((r) => r.id),
  );
  const current = (actions.data ?? []).filter((a) => a.review_id === review.id);
  const carried = (actions.data ?? []).filter((a) => earlier.has(a.review_id) && a.status !== 'fait');
  const name = (id: string) => {
    const p = team.byId.get(id);
    return p ? fullName(p) : id === profile.id ? fullName(profile) : '—';
  };
  const canEdit = (a: ReviewAction) => isManager || a.owner_id === profile.id;
  const today = todayIso();

  const row = (a: ReviewAction) => (
    <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-base">{a.title}</span>
        <span className="text-xs text-fg-subtle">
          {name(a.owner_id)}
          {a.due_date && (
            <span className={a.status !== 'fait' && a.due_date < today ? 'text-danger' : undefined}> · échéance {formatDate(a.due_date)}</span>
          )}
        </span>
      </div>
      <NativeSelect
        aria-label={`Statut de ${a.title}`}
        className="w-32"
        value={a.status}
        disabled={!canEdit(a)}
        onChange={(e) => setStatus.mutate({ id: a.id, status: e.target.value as ActionStatus })}
      >
        {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((s) => (
          <option key={s} value={s}>
            {ACTION_STATUS[s]}
          </option>
        ))}
      </NativeSelect>
    </li>
  );

  const carriedPanel = (
    <Panel title="Engagements du dernier 1 à 1" description="On commence par eux : objectif fixé, résultat obtenu, écart, ajustement" flush>
      {carried.length === 0 ? (
        <EmptyState title="Rien en suspens" description="Toutes les actions des entretiens précédents sont terminées." />
      ) : (
        <ul className="divide-y divide-line">{carried.map(row)}</ul>
      )}
    </Panel>
  );
  if (previousOnly) return carriedPanel;

  return (
    <>
      <Panel title="Engagements réciproques" description="Ce que chacun s’engage à faire : le collaborateur et vous" flush>
        {current.length === 0 && !isManager ? (
          <EmptyState title="Aucun engagement" description="Un 1 à 1 ne se termine pas par une conversation, mais par un engagement." />
        ) : (
          <ul className="divide-y divide-line">{current.map(row)}</ul>
        )}
        {isManager && !review.manager_signed_at && (
          <form
            className="flex flex-wrap items-end gap-2 border-t border-line p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) return;
              add.mutate(
                { review_id: review.id, title: title.trim(), owner_id: owner, due_date: due || null },
                { onSuccess: () => { setTitle(''); setDue(''); } },
              );
            }}
          >
            <Input aria-label="Nouvelle action" className="min-w-60 flex-1" placeholder="Nouvelle action" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            <NativeSelect aria-label="Responsable" className="w-48" value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value={review.collaborator_id}>{name(review.collaborator_id)}</option>
              <option value={profile.id}>{fullName(profile)}</option>
            </NativeSelect>
            <Input aria-label="Échéance" type="date" className="w-40" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button type="submit" disabled={title.trim().length < 3 || add.isPending}>
              <Plus aria-hidden />
              Ajouter
            </Button>
          </form>
        )}
      </Panel>
      {carriedPanel}
    </>
  );
}
