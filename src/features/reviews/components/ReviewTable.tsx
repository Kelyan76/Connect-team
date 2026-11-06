import { useNavigate } from 'react-router-dom';
import type { Person } from '@/features/team/api';
import { formatDate, formatDateTime, formatTime, relativeDays } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge, StatusDot } from '@/shared/ui/badge';
import { EmptyState } from '@/shared/ui/feedback';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import type { Review } from '../api';
import { KIND_LABEL, PREP_META, prepStatus, reviewStage } from '../lib/review-rules';

const STAGE = {
  preparation: { label: 'Planifié', tone: 'neutral' },
  a_signer: { label: 'À signer', tone: 'warning' },
  signe: { label: 'Signé', tone: 'success' },
  annule: { label: 'Annulé', tone: 'outline' },
} as const;

interface ReviewTableProps {
  reviews: Review[];
  byId: Map<string, Person>;
  showPerson: boolean;
  empty: string;
  /** Jours restants : affiche la colonne de préparation (entretiens à venir). */
  when?: (r: Review) => number;
}

export function ReviewTable({ reviews, byId, showPerson, empty, when }: ReviewTableProps) {
  const navigate = useNavigate();
  if (reviews.length === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="Rien à afficher" description={empty} />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-surface">
      <Table>
        <THead>
          <tr>
            {showPerson && <Th>Collaborateur</Th>}
            <Th>Type</Th>
            <Th align="right">Date</Th>
            <Th>{when ? 'Préparation' : 'Statut'}</Th>
            {!when && <Th>Signatures</Th>}
          </tr>
        </THead>
        <TBody>
          {reviews.map((r) => {
            const person = byId.get(r.collaborator_id);
            const prep = PREP_META[prepStatus(r)];
            const stage = STAGE[reviewStage(r)];
            return (
              <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/entretiens/${r.id}`)}>
                {showPerson && <Td>{person ? <PersonLabel person={person} detail={person.job_title} /> : '—'}</Td>}
                <Td className="whitespace-nowrap">{KIND_LABEL[r.kind]}</Td>
                <Td numeric>
                  <span className="flex flex-col items-end">
                    <span>
                      {formatDate(r.scheduled_at)} · {formatTime(r.scheduled_at)}
                    </span>
                    {when && <span className="text-xs text-fg-subtle">{relativeDays(when(r))}</span>}
                  </span>
                </Td>
                <Td>{when ? <StatusDot tone={prep.tone}>{prep.label}</StatusDot> : <Badge tone={stage.tone}>{stage.label}</Badge>}</Td>
                {!when && (
                  <Td className="text-xs text-fg-subtle">
                    {r.manager_signed_at ? `Manager ${formatDateTime(r.manager_signed_at)}` : 'Manager : en attente'}
                    <br />
                    {r.collaborator_signed_at ? `Collaborateur ${formatDateTime(r.collaborator_signed_at)}` : 'Collaborateur : en attente'}
                  </Td>
                )}
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
