import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect } from '@/shared/ui/input';
import { KIND_LABEL, type ReviewKind } from '../lib/review-rules';
import { useDecideRequest, useScheduleReview, useTemplateQuestions, useTemplates } from '../queries';

const schema = z.object({
  collaborator_id: z.string().min(1, 'Choisissez un collaborateur.'),
  kind: z.enum(['one_to_one', 'annuel', 'professionnel']),
  date: z.string().min(1, 'Date requise.'),
  time: z.string().min(1, 'Heure requise.'),
  duration_minutes: z.coerce.number().int().min(15, '15 minutes minimum.').max(480),
  location: z.string().max(120),
});
type Values = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultCollaborator?: string;
  defaultDate?: string;
  requestId?: string;
}

export function ScheduleDialog({ open, onOpenChange, defaultCollaborator, defaultDate, requestId }: Props) {
  const navigate = useNavigate();
  const { profile } = useCurrentUser();
  const team = useTeamMembers();
  const templates = useTemplates();
  const questions = useTemplateQuestions();
  const schedule = useScheduleReview();
  const decide = useDecideRequest();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { collaborator_id: '', kind: 'one_to_one', date: isoAddDays(todayIso(), 7), time: '10:00', duration_minutes: 45, location: `Bureau de ${profile.first_name}` },
  });

  useEffect(() => {
    if (open) {
      form.reset({ ...form.getValues(), collaborator_id: defaultCollaborator ?? '', date: defaultDate ?? isoAddDays(todayIso(), 7) });
    }
    // Réinitialisation à l'ouverture uniquement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCollaborator, defaultDate]);

  const kind = form.watch('kind');
  const template = templates.data?.find((t) => t.kind === kind && t.is_default) ?? templates.data?.find((t) => t.kind === kind);
  const templateQuestions = (questions.data ?? []).filter((q) => q.template_id === template?.id);

  const onSubmit = form.handleSubmit(async (v) => {
    const scheduled = new Date(`${v.date}T${v.time}:00`);
    const id = await schedule.mutateAsync({
      input: {
        collaborator_id: v.collaborator_id,
        kind: v.kind,
        template_id: template?.id ?? null,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: v.duration_minutes,
        location: v.location,
      },
      questions: templateQuestions,
    });
    if (requestId) await decide.mutateAsync({ id: requestId, status: 'validee', reviewId: id });
    onOpenChange(false);
    navigate(`/entretiens/${id}`);
  });

  const e = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Planifier un entretien"
        description="Le collaborateur pourra préparer sa partie dès maintenant."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" form="schedule-form" variant="primary" disabled={schedule.isPending}>
              Planifier
            </Button>
          </>
        }
      >
        <form id="schedule-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="Collaborateur" error={e.collaborator_id?.message}>
            <NativeSelect {...form.register('collaborator_id')}>
              <option value="">Choisir…</option>
              {team.active.map((p) => (
                <option key={p.id} value={p.id}>
                  {fullName(p)} · {p.job_title}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Type d’entretien" hint={template ? `Trame : ${template.name} (${templateQuestions.length} questions)` : 'Aucune trame pour ce type.'}>
            <NativeSelect {...form.register('kind')}>
              {(Object.keys(KIND_LABEL) as ReviewKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date" error={e.date?.message}>
              <Input type="date" {...form.register('date')} />
            </Field>
            <Field label="Heure" error={e.time?.message}>
              <Input type="time" step={900} {...form.register('time')} />
            </Field>
            <Field label="Durée (min)" error={e.duration_minutes?.message}>
              <Input type="number" min={15} max={480} step={15} {...form.register('duration_minutes')} />
            </Field>
          </div>
          <Field label="Lieu" optional>
            <Input {...form.register('location')} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
