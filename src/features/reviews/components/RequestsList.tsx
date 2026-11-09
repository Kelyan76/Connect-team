import { CalendarClock, CalendarPlus, Clock, Quote, X } from 'lucide-react';
import type { Person } from '@/features/team/api';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, fullName, relativeDays } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
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

/**
 * Demandes de 1 à 1 en cartes : qui, le message en entier (bien lisible), la date souhaitée,
 * puis les actions sur toute la largeur sur téléphone.
 */
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
      <div className="rounded-lg border border-line bg-surface shadow-sm">
        <EmptyState
          title="Aucune demande"
          description={isManager ? 'Les demandes de 1 à 1 de l’équipe apparaîtront ici.' : 'Vous n’avez pas encore demandé de 1 à 1.'}
        />
      </div>
    );
  }
  return (
    <ul className="stagger flex flex-col gap-3">
      {requests.map((r) => {
        const person = byId.get(r.collaborator_id);
        const status = STATUS[r.status];
        const pending = r.status === 'en_attente';
        return (
          <li key={r.id} className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              {isManager && person && <Avatar person={person} />}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold">{isManager && person ? fullName(person) : 'Ma demande de 1 à 1'}</span>
                <span className="flex items-center gap-1 text-sm text-fg-subtle">
                  <Clock className="size-3" aria-hidden />
                  Demandée {relativeDays(daysFromToday(r.created_at.slice(0, 10)))}
                </span>
              </div>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>

            <div className="flex gap-3 rounded bg-surface-muted px-4 py-3">
              <Quote className="mt-1 size-4 shrink-0 text-fg-subtle" aria-hidden />
              <p className="min-w-0 whitespace-pre-wrap break-words text-base leading-6 text-fg">
                {r.message || <span className="text-fg-subtle">Sans précision.</span>}
              </p>
            </div>

            {r.preferred_date && (
              <span className="flex items-center gap-2 text-sm text-fg-muted">
                <CalendarClock className="size-4 text-fg-subtle" aria-hidden />
                Date souhaitée : <span className="font-medium text-fg">{formatDate(r.preferred_date)}</span>
              </span>
            )}

            {isManager && pending && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={() =>
                    decide.mutate(
                      { id: r.id, status: 'refusee', reviewId: null },
                      { onSuccess: () => toast.success(`Demande de ${person ? fullName(person) : ''} refusée`) },
                    )
                  }
                >
                  <X aria-hidden />
                  Refuser
                </Button>
                <Button className="flex-1 sm:flex-none" variant="primary" onClick={() => onAccept(r)}>
                  <CalendarPlus aria-hidden />
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
