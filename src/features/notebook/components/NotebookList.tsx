import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { OBS_TONE, useDeleteObservation, useObservations, type ObservationTone } from '../queries';
import { ObservationDialog } from './ObservationDialog';

/** Carnet d'observations d'un collaborateur (privé au manager). */
export function NotebookList({ personId }: { personId: string }) {
  const observations = useObservations();
  const remove = useDeleteObservation();
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const list = (observations.data ?? []).filter((o) => o.collaborator_id === personId);

  return (
    <Panel
      title="Carnet d’observations"
      description="Privé. Des faits datés, à reprendre en feedback ou au prochain 1 à 1 ; supprimez-les une fois traités."
      actions={
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Noter
        </Button>
      }
      flush
    >
      {!observations.data ? (
        <Skeleton className="m-4 h-32" />
      ) : list.length === 0 ? (
        <EmptyState title="Carnet vide" description="Notez au fil de la semaine ce que vous repérez : une réunion réussie, une tension, un changement d’attitude." />
      ) : (
        <ul className="divide-y divide-line">
          {list.map((o) => (
            <li key={o.id} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${OBS_TONE[o.tone as ObservationTone].dot}`} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-fg-subtle">
                  {formatDate(o.observed_on)} · {OBS_TONE[o.tone as ObservationTone].label}
                </span>
                <span className="text-base">{o.body}</span>
              </div>
              <Button size="icon-sm" variant="ghost" aria-label="Supprimer l’observation" onClick={() => setToDelete(o.id)}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ObservationDialog open={adding} onOpenChange={setAdding} defaultPerson={personId} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette observation ?"
        description="Elle disparaîtra définitivement du carnet."
        confirmLabel="Supprimer"
        onConfirm={() => toDelete && remove.mutate(toDelete, { onSettled: () => setToDelete(null) })}
      />
    </Panel>
  );
}
