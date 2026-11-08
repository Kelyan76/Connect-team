import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Person } from '@/features/team/api';
import { formatDate, formatDateTime, formatTime, fullName, relativeDays } from '@/shared/lib/format';
import { Avatar, PersonLabel } from '@/shared/ui/avatar';
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
    <>
      {/* Téléphone : une carte par entretien, tout lisible sans défilement horizontal. */}
      <ul className="stagger flex flex-col gap-3 md:hidden">
        {reviews.map((r) => {
          const person = byId.get(r.collaborator_id);
          const prep = PREP_META[prepStatus(r)];
          const stage = STAGE[reviewStage(r)];
          return (
            <li key={r.id}>
              <Link to={`/entretiens/${r.id}`} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm transition-colors active:bg-surface-muted">
                <span className="flex items-center gap-3">
                  {showPerson && person && <Avatar person={person} />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-base font-semibold">{showPerson && person ? fullName(person) : KIND_LABEL[r.kind]}</span>
                    <span className="truncate text-sm text-fg-subtle">{showPerson ? KIND_LABEL[r.kind] : person?.job_title}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </span>
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    <span className="font-medium">{formatDate(r.scheduled_at)}</span> à {formatTime(r.scheduled_at)}
                    {when && <span className="text-fg-subtle"> · {relativeDays(when(r))}</span>}
                  </span>
                  {when ? <StatusDot tone={prep.tone}>{prep.label}</StatusDot> : <Badge tone={stage.tone}>{stage.label}</Badge>}
                </span>
                {!when && (
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-subtle">
                    <span>{r.manager_signed_at ? `Manager : signé le ${formatDate(r.manager_signed_at)}` : 'Manager : à signer'}</span>
                    <span>{r.collaborator_signed_at ? `Collaborateur : signé le ${formatDate(r.collaborator_signed_at)}` : 'Collaborateur : à signer'}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    <div className="hidden rounded-lg border border-line bg-surface shadow-sm md:block">
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
    </>
  );
}
