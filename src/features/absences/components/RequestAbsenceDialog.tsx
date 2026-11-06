import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { daysBetween, isoAddDays, todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { workingDaysCount } from '../lib/overlap';
import { ABSENCE_KIND, useRequestAbsence, type AbsenceKind } from '../queries';

// Mêmes règles que la table : fin ≥ début, 90 jours au plus.
const schema = z
  .object({
    kind: z.enum(['conges_payes', 'rtt', 'maladie', 'formation', 'sans_solde']),
    start_date: z.string().min(1, 'Date requise.'),
    end_date: z.string().min(1, 'Date requise.'),
    comment: z.string().max(500),
  })
  .refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: 'La fin doit suivre le début.' })
  .refine((v) => daysBetween(v.start_date, v.end_date) <= 90, { path: ['end_date'], message: '90 jours maximum par demande.' });
type Values = z.infer<typeof schema>;

export function RequestAbsenceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { profile } = useCurrentUser();
  const request = useRequestAbsence();
  const start = isoAddDays(todayIso(), 14);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { kind: 'conges_payes', start_date: start, end_date: isoAddDays(start, 4), comment: '' } });
  const [s, e] = form.watch(['start_date', 'end_date']);
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    await request.mutateAsync({ ...v, collaborator_id: profile.id });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Demander un congé"
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" form="absence-form" variant="primary" disabled={request.isPending}>
              Envoyer la demande
            </Button>
          </>
        }
      >
        <form id="absence-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="Motif">
            <NativeSelect {...form.register('kind')}>
              {(Object.keys(ABSENCE_KIND) as AbsenceKind[]).map((k) => (
                <option key={k} value={k}>
                  {ABSENCE_KIND[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Du" error={errors.start_date?.message}>
              <Input type="date" {...form.register('start_date')} />
            </Field>
            <Field label="Au" error={errors.end_date?.message} hint={s && e && e >= s ? `${workingDaysCount(s, e)} jours ouvrés` : undefined}>
              <Input type="date" {...form.register('end_date')} />
            </Field>
          </div>
          <Field label="Commentaire" optional>
            <Textarea rows={2} maxLength={500} {...form.register('comment')} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
