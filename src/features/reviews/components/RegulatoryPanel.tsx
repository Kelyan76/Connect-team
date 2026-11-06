import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, fullName } from '@/shared/lib/format';
import { Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { cn } from '@/shared/lib/cn';
import { nextRegulatoryDue } from '../lib/review-rules';
import { useReviews } from '../queries';

/** Échéances réglementaires : entretien annuel (12 mois) et professionnel (24 mois). */
export function RegulatoryPanel() {
  const { profile, isManager } = useCurrentUser();
  const team = useTeamMembers();
  const reviews = useReviews();
  const people = isManager ? team.active : [profile];

  const lastHeld = (personId: string, kind: 'annuel' | 'professionnel') =>
    reviews.data?.filter((r) => r.collaborator_id === personId && r.kind === kind && r.status === 'termine')[0]?.scheduled_at ?? null;
  const planned = (personId: string, kind: 'annuel' | 'professionnel') =>
    reviews.data?.some((r) => r.collaborator_id === personId && r.kind === kind && r.status === 'planifie');

  const rows = people
    .flatMap((p) =>
      (['annuel', 'professionnel'] as const).map((kind) => ({
        person: p,
        kind,
        due: nextRegulatoryDue(kind, lastHeld(p.id, kind), p.hired_on),
        planned: planned(p.id, kind),
      })),
    )
    .filter((r) => r.due)
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))
    .slice(0, isManager ? 8 : 2);

  return (
    <Panel title="Échéances réglementaires" description="Annuel : 12 mois · professionnel : 24 mois (art. L6315-1)" flush className="self-start">
      {!reviews.data ? (
        <Skeleton className="m-4 h-24" />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r) => {
            const left = daysFromToday(r.due ?? '');
            return (
              <li key={`${r.person.id}-${r.kind}`} className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{isManager ? fullName(r.person) : r.kind === 'annuel' ? 'Entretien annuel' : 'Entretien professionnel'}</span>
                  <span className="text-xs text-fg-subtle">
                    {isManager ? (r.kind === 'annuel' ? 'Annuel' : 'Professionnel') : ''}
                    {r.planned ? ' · planifié' : ''}
                  </span>
                </div>
                <span className={cn('tabular whitespace-nowrap text-sm', !r.planned && left < 0 && 'text-danger', !r.planned && left >= 0 && left <= 30 && 'text-warning')}>
                  {formatDate(r.due ?? '')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
