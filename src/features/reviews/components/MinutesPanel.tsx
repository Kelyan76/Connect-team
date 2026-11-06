import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Field } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import type { Review } from '../api';
import { reviewStage } from '../lib/review-rules';
import { useUpdateReview } from '../queries';

/** Prise de notes en direct et synthèse, puis clôture de l'entretien. */
export function MinutesPanel({ review, isManager }: { review: Review; isManager: boolean }) {
  const update = useUpdateReview(review.id);
  const close = useUpdateReview(review.id, 'Entretien clos : le compte-rendu peut être signé');
  const [notes, setNotes] = useState(review.live_notes);
  const [summary, setSummary] = useState(review.summary);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const locked = !isManager || !!review.manager_signed_at;
  const stage = reviewStage(review);

  useEffect(() => {
    setNotes(review.live_notes);
    setSummary(review.summary);
  }, [review.live_notes, review.summary]);

  const persist = (patch: { live_notes?: string; summary?: string }) =>
    update.mutate(patch, { onSuccess: () => setSavedAt(new Date().toISOString()) });

  return (
    <Panel
      title="Notes et synthèse"
      description={locked ? undefined : savedAt ? `Enregistré à ${formatTime(savedAt)}` : 'Enregistrement automatique à la sortie du champ'}
      actions={
        isManager && stage === 'preparation' ? (
          <Button size="sm" variant="primary" onClick={() => setConfirm(true)}>
            <CheckCircle2 aria-hidden />
            Clore l’entretien
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Notes prises pendant l’entretien">
          <Textarea
            rows={7}
            maxLength={20000}
            readOnly={locked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== review.live_notes && persist({ live_notes: notes })}
            placeholder={locked ? 'Aucune note.' : 'Points abordés, décisions, engagements…'}
          />
        </Field>
        <Field label="Synthèse partagée" hint="Reprise dans le compte-rendu signé et dans l’export PDF.">
          <Textarea
            rows={3}
            maxLength={8000}
            readOnly={locked}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => summary !== review.summary && persist({ summary })}
          />
        </Field>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Clore l’entretien ?"
        description="Les préparations sont figées et le compte-rendu est soumis à la signature des deux parties."
        confirmLabel="Clore l’entretien"
        destructive={false}
        pending={close.isPending}
        onConfirm={() =>
          close.mutate(
            { status: 'termine', completed_at: new Date().toISOString(), live_notes: notes, summary },
            { onSettled: () => setConfirm(false) },
          )
        }
      />
    </Panel>
  );
}
