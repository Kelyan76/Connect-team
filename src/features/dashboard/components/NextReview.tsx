import { Link } from 'react-router-dom';
import { KIND_LABEL, PREP_META, prepStatus } from '@/features/reviews/lib/review-rules';
import { useReviews } from '@/features/reviews/queries';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, formatTime, relativeDays } from '@/shared/lib/format';
import { StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';

/** Prochain entretien du collaborateur et statut de préparation. */
export function NextReview() {
  const reviews = useReviews();
  const next = reviews.data
    ?.filter((r) => r.status === 'planifie' && daysFromToday(r.scheduled_at.slice(0, 10)) >= 0)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  return (
    <Panel title="Mon prochain entretien">
      {!reviews.data ? (
        <Skeleton className="h-16" />
      ) : !next ? (
        <EmptyState
          className="p-0"
          title="Aucun entretien planifié"
          description="Vous pouvez demander un one-to-one à votre manager."
          action={
            <Button asChild size="sm">
              <Link to="/entretiens?demande=1">Demander un one-to-one</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <span className="text-md font-semibold">{KIND_LABEL[next.kind]}</span>
            <span className="text-sm text-fg-muted">
              {formatDate(next.scheduled_at)} à {formatTime(next.scheduled_at)} · {relativeDays(daysFromToday(next.scheduled_at.slice(0, 10)))}
              {next.location ? ` · ${next.location}` : ''}
            </span>
          </div>
          <StatusDot tone={PREP_META[prepStatus(next)].tone}>{PREP_META[prepStatus(next)].label}</StatusDot>
          <Button asChild variant={next.collaborator_prepared_at ? 'secondary' : 'primary'} size="sm" className="self-start">
            <Link to={`/entretiens/${next.id}`}>{next.collaborator_prepared_at ? 'Consulter ma préparation' : 'Préparer mon entretien'}</Link>
          </Button>
        </div>
      )}
    </Panel>
  );
}
