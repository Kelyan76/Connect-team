import { useCurrentUser } from '@/features/auth/AuthProvider';
import { ACTION_STATUS, useMeetingActions, useSetMeetingActionStatus, type ActionStatus } from '@/features/meetings/queries';
import { useReviewActions, useSetActionStatus } from '@/features/reviews/queries';
import { todayIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';

/** Actions assignées au collaborateur (entretiens et réunions), avec mise à jour du statut. */
export function MyActions() {
  const { profile } = useCurrentUser();
  const reviewActions = useReviewActions();
  const meetingActions = useMeetingActions();
  const setReview = useSetActionStatus();
  const setMeeting = useSetMeetingActionStatus();
  const today = todayIso();

  const items = [
    ...(reviewActions.data ?? []).map((a) => ({ ...a, origin: 'Entretien' as const })),
    ...(meetingActions.data ?? []).map((a) => ({ ...a, origin: 'Réunion' as const })),
  ]
    .filter((a) => a.owner_id === profile.id && a.status !== 'fait')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));

  return (
    <Panel title="Mes actions" description="Issues des entretiens et des réunions" flush>
      {!reviewActions.data || !meetingActions.data ? (
        <Skeleton className="m-4 h-16" />
      ) : items.length === 0 ? (
        <EmptyState title="Aucune action en cours" description="Les actions décidées avec votre manager apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-base">{a.title}</span>
                <span className={a.due_date && a.due_date < today ? 'text-xs text-danger' : 'text-xs text-fg-subtle'}>
                  {a.origin}
                  {a.due_date ? ` · échéance ${formatDate(a.due_date)}` : ''}
                </span>
              </div>
              <NativeSelect
                aria-label={`Statut de ${a.title}`}
                className="w-32 shrink-0"
                value={a.status}
                onChange={(e) => {
                  const status = e.target.value as ActionStatus;
                  if (a.origin === 'Entretien') setReview.mutate({ id: a.id, status });
                  else setMeeting.mutate({ id: a.id, status });
                }}
              >
                {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {ACTION_STATUS[s]}
                  </option>
                ))}
              </NativeSelect>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
