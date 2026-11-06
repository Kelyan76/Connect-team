import { PenLine, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Panel } from '@/shared/ui/layout';
import type { Review } from '../api';
import { useSignReview } from '../queries';

/** Signature électronique simple : horodatage serveur de l'accord de chaque partie. */
export function Signatures({ review, viewer }: { review: Review; viewer: 'manager' | 'collaborateur' }) {
  const sign = useSignReview(review.id);
  const [confirm, setConfirm] = useState(false);
  const mine = viewer === 'manager' ? review.manager_signed_at : review.collaborator_signed_at;
  const closed = review.status === 'termine';
  const both = review.manager_signed_at && review.collaborator_signed_at;

  const block = (label: string, at: string | null) => (
    <div className="flex flex-1 flex-col gap-1 rounded border border-line px-4 py-3">
      <span className="text-xs text-fg-subtle">{label}</span>
      {at ? (
        <span className="flex items-center gap-2 text-sm font-medium text-success">
          <ShieldCheck className="size-4" aria-hidden />
          Signé le {formatDateTime(at)}
        </span>
      ) : (
        <span className="text-sm text-fg-muted">En attente de signature</span>
      )}
    </div>
  );

  return (
    <Panel
      title="Validation du compte-rendu"
      description={both ? 'Compte-rendu signé par les deux parties : il n’est plus modifiable.' : closed ? 'Chaque partie confirme le compte-rendu.' : 'Disponible après la clôture de l’entretien.'}
      actions={
        closed && !mine ? (
          <Button size="sm" variant="primary" onClick={() => setConfirm(true)}>
            <PenLine aria-hidden />
            Signer
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        {block('Collaborateur', review.collaborator_signed_at)}
        {block('Manager', review.manager_signed_at)}
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Signer le compte-rendu ?"
        description="Votre signature est horodatée et vaut accord sur le contenu. Une fois signé par les deux parties, le compte-rendu ne peut plus être modifié."
        confirmLabel="Signer"
        destructive={false}
        pending={sign.isPending}
        onConfirm={() => sign.mutate(undefined, { onSettled: () => setConfirm(false) })}
      />
    </Panel>
  );
}
