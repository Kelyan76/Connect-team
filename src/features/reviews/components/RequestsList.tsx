import type { Person } from '@/features/team/api';
import { formatDate, fullName } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/feedback';
import { toast } from '@/shared/ui/toaster';
import type { ReviewRequest } from '../api';
import { useDecideRequest } from '../queries';

const STATUS = {
  en_attente: { label: 'En attente', tone: 'warning' },
  validee: { label: 'Planifiée', tone: 'success' },
  refusee: { label: 'Refusée', tone: 'danger' },
} as const;

export function RequestsList({
  requests,
  byId,
  isManager,
  onAccept,
}: {
  requests: ReviewRequest[];
  byId: Map<string, Person>;
  isManager: boolean;
  onAccept: (r: ReviewRequest) => void;
}) {
  const decide = useDecideRequest();
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="Aucune demande"
          description={isManager ? 'Les demandes de one-to-one de l’équipe apparaîtront ici.' : 'Vous n’avez pas encore demandé de one-to-one.'}
        />
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
      {requests.map((r) => {
        const person = byId.get(r.collaborator_id);
        return (
          <li key={r.id} className="flex flex-wrap items-start gap-4 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {isManager && person && <PersonLabel person={person} detail={person.job_title} />}
              <p className="text-base">{r.message || 'Sans précision.'}</p>
              <span className="text-xs text-fg-subtle">
                Demandé le {formatDate(r.created_at)}
                {r.preferred_date ? ` · date souhaitée : ${formatDate(r.preferred_date)}` : ''}
              </span>
            </div>
            <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
            {isManager && r.status === 'en_attente' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    decide.mutate(
                      { id: r.id, status: 'refusee', reviewId: null },
                      { onSuccess: () => toast.success(`Demande de ${person ? fullName(person) : ''} refusée`) },
                    )
                  }
                >
                  Refuser
                </Button>
                <Button size="sm" variant="primary" onClick={() => onAccept(r)}>
                  Planifier
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
