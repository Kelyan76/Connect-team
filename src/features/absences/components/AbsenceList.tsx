import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import type { Person } from '@/features/team/api';
import { formatDate } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState } from '@/shared/ui/feedback';
import { Input } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import { workingDaysCount } from '../lib/overlap';
import { ABSENCE_KIND, REQUEST_STATUS, useCancelAbsence, useDecideAbsence, type Absence } from '../queries';

/** Demandes d'absence : décision du manager, annulation par le collaborateur tant qu'elle est en attente. */
export function AbsenceList({ absences, byId, isManager }: { absences: Absence[]; byId: Map<string, Person>; isManager: boolean }) {
  const { profile } = useCurrentUser();
  const decide = useDecideAbsence();
  const cancel = useCancelAbsence();
  const [refusing, setRefusing] = useState<Absence | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState<Absence | null>(null);
  const sorted = [...absences].sort((a, b) => (a.status === 'en_attente' ? -1 : 0) - (b.status === 'en_attente' ? -1 : 0) || b.start_date.localeCompare(a.start_date));

  return (
    <Panel title={isManager ? 'Demandes et absences' : 'Mes demandes'} flush>
      {sorted.length === 0 ? (
        <EmptyState title="Aucune absence" description={isManager ? 'Les demandes de l’équipe apparaîtront ici.' : 'Vous n’avez pas encore fait de demande.'} />
      ) : (
        <Table>
          <THead>
            <tr>
              {isManager && <Th>Collaborateur</Th>}
              <Th>Motif</Th>
              <Th align="right">Du</Th>
              <Th align="right">Au</Th>
              <Th align="right">Jours ouvrés</Th>
              <Th>Statut</Th>
              <Th className="sr-only">Actions</Th>
            </tr>
          </THead>
          <TBody>
            {sorted.map((a) => {
              const p = byId.get(a.collaborator_id);
              return (
                <Tr key={a.id}>
                  {isManager && <Td>{p ? <PersonLabel person={p} size="xs" /> : '—'}</Td>}
                  <Td>
                    <span className="flex flex-col">
                      {ABSENCE_KIND[a.kind]}
                      {(a.comment || a.decision_comment) && <span className="text-xs text-fg-subtle">{a.decision_comment || a.comment}</span>}
                    </span>
                  </Td>
                  <Td numeric>{formatDate(a.start_date)}</Td>
                  <Td numeric>{formatDate(a.end_date)}</Td>
                  <Td numeric>{workingDaysCount(a.start_date, a.end_date)}</Td>
                  <Td>
                    <Badge tone={REQUEST_STATUS[a.status].tone}>{REQUEST_STATUS[a.status].label}</Badge>
                  </Td>
                  <Td align="right" className="whitespace-nowrap">
                    {isManager && a.status === 'en_attente' && (
                      <span className="inline-flex gap-2">
                        <Button size="sm" onClick={() => { setRefusing(a); setReason(''); }}>
                          Refuser
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => decide.mutate({ id: a.id, status: 'validee', comment: '', by: profile.id })}>
                          Valider
                        </Button>
                      </span>
                    )}
                    {!isManager && a.status === 'en_attente' && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelling(a)}>
                        Annuler la demande
                      </Button>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}
      <ConfirmDialog
        open={refusing !== null}
        onOpenChange={(o) => !o && setRefusing(null)}
        title="Refuser cette demande ?"
        description={
          <span className="flex flex-col gap-3">
            Le collaborateur verra le motif indiqué.
            <Input aria-label="Motif du refus" placeholder="Motif (facultatif)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
          </span>
        }
        confirmLabel="Refuser"
        onConfirm={() => refusing && decide.mutate({ id: refusing.id, status: 'refusee', comment: reason, by: profile.id }, { onSettled: () => setRefusing(null) })}
      />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Annuler cette demande ?"
        description="La demande sera supprimée. Vous pourrez en refaire une."
        confirmLabel="Annuler la demande"
        onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSettled: () => setCancelling(null) })}
      />
    </Panel>
  );
}
