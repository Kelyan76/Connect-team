import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Person } from '@/features/team/api';
import type { Review } from '@/features/reviews/api';
import { KIND_LABEL, PREP_META, prepStatus } from '@/features/reviews/lib/review-rules';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, formatTime, fullName, relativeDays } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { StatusDot } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';

/** Prochains entretiens avec leur statut de préparation, en liste lisible sur téléphone. */
export function UpcomingReviews({ reviews, byId }: { reviews: Review[]; byId: Map<string, Person> }) {
  return (
    <Panel title="Prochains entretiens" flush>
      {reviews.length === 0 ? (
        <EmptyState title="Aucun entretien planifié" description="Planifiez les 1 à 1 de l’équipe depuis la page Entretiens." />
      ) : (
        <ul className="stagger divide-y divide-line">
          {reviews.map((r) => {
            const person = byId.get(r.collaborator_id);
            const prep = PREP_META[prepStatus(r)];
            const days = daysFromToday(r.scheduled_at.slice(0, 10));
            return (
              <li key={r.id}>
                <Link to={`/entretiens/${r.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-muted/60">
                  {person && <Avatar person={person} />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-medium">{person ? fullName(person) : '—'}</span>
                    <span className="truncate text-sm text-fg-subtle">
                      {KIND_LABEL[r.kind]} · {formatDate(r.scheduled_at)} à {formatTime(r.scheduled_at)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <span className="text-sm text-fg-muted">{relativeDays(days)}</span>
                    <StatusDot tone={prep.tone}>{prep.label}</StatusDot>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
