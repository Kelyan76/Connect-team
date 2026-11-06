import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTeamMembers } from '@/features/team/queries';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { NativeSelect, Textarea } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/toggle';
import { FEEDBACK_KIND, useCreateFeedback, type FeedbackKind } from '../queries';

const schema = z.object({
  collaborator_id: z.string().min(1, 'Choisissez un collaborateur.'),
  kind: z.enum(['point_fort', 'axe_progres', 'reconnaissance']),
  body: z.string().trim().min(3, '3 caractères minimum.').max(2000, '2 000 caractères maximum.'),
  is_shared: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function FeedbackDialog({ open, onOpenChange, defaultPerson }: { open: boolean; onOpenChange: (o: boolean) => void; defaultPerson?: string }) {
  const team = useTeamMembers();
  const create = useCreateFeedback();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { collaborator_id: '', kind: 'point_fort', body: '', is_shared: true },
  });
  useEffect(() => {
    if (open) form.reset({ collaborator_id: defaultPerson ?? '', kind: 'point_fort', body: '', is_shared: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const e = form.formState.errors;

  const onSubmit = form.handleSubmit(async (v) => {
    await create.mutateAsync(v);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Rédiger un feedback"
        description="Factuel, daté, centré sur un comportement observable."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" form="feedback-form" variant="primary" disabled={create.isPending}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="feedback-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Collaborateur" error={e.collaborator_id?.message}>
              <NativeSelect {...form.register('collaborator_id')}>
                <option value="">Choisir…</option>
                {team.active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Type">
              <NativeSelect {...form.register('kind')}>
                {(Object.keys(FEEDBACK_KIND) as FeedbackKind[]).map((k) => (
                  <option key={k} value={k}>
                    {FEEDBACK_KIND[k]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Feedback" error={e.body?.message}>
            <Textarea rows={5} {...form.register('body')} placeholder="Ce que vous avez observé, et l’effet que cela a eu." />
          </Field>
          <Controller
            control={form.control}
            name="is_shared"
            render={({ field }) => (
              <label className="flex items-start gap-3">
                <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-px" />
                <span className="flex flex-col">
                  <span className="text-base font-medium">Partager avec le collaborateur</span>
                  <span className="text-xs text-fg-subtle">Sinon, le feedback reste privé et sert uniquement à votre préparation.</span>
                </span>
              </label>
            )}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
