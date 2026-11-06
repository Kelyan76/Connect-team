import { useNavigate } from 'react-router-dom';
import type { Person } from '@/features/team/api';
import type { Review } from '@/features/reviews/api';
import { KIND_LABEL, PREP_META, prepStatus } from '@/features/reviews/lib/review-rules';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, formatTime, relativeDays } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { StatusDot } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';

/** Prochains entretiens avec leur statut de préparation. */
export function UpcomingReviews({ reviews, byId }: { reviews: Review[]; byId: Map<string, Person> }) {
  const navigate = useNavigate();
  return (
    <Panel title="Prochains entretiens" flush>
      {reviews.length === 0 ? (
        <EmptyState title="Aucun entretien planifié" description="Planifiez les one-to-one de l’équipe depuis la page Entretiens." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Collaborateur</Th>
              <Th>Type</Th>
              <Th align="right">Date</Th>
              <Th>Préparation</Th>
            </tr>
          </THead>
          <TBody>
            {reviews.map((r) => {
              const person = byId.get(r.collaborator_id);
              const prep = PREP_META[prepStatus(r)];
              const days = daysFromToday(r.scheduled_at.slice(0, 10));
              return (
                <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/entretiens/${r.id}`)}>
                  <Td>{person && <PersonLabel person={person} detail={person.job_title} />}</Td>
                  <Td className="whitespace-nowrap text-fg-muted">{KIND_LABEL[r.kind]}</Td>
                  <Td numeric>
                    <span className="flex flex-col items-end">
                      <span>
                        {formatDate(r.scheduled_at)} · {formatTime(r.scheduled_at)}
                      </span>
                      <span className="text-xs text-fg-subtle">{relativeDays(days)}</span>
                    </span>
                  </Td>
                  <Td>
                    <StatusDot tone={prep.tone}>{prep.label}</StatusDot>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}
