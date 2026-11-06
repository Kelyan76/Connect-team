import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { toUserMessage } from '@/shared/lib/errors';
import { isLocalBackend } from '@/shared/lib/supabase';
import { todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { useInviteMember } from '../queries';

// Mêmes contraintes que la table profiles (longueurs, format de l'e-mail).
const schema = z.object({
  first_name: z.string().trim().min(1, 'Prénom requis.').max(60),
  last_name: z.string().trim().min(1, 'Nom requis.').max(60),
  email: z.string().trim().email('Adresse e-mail invalide.'),
  job_title: z.string().trim().min(2, 'Poste requis.').max(80),
  hired_on: z.string().min(1, 'Date requise.'),
});
type Values = z.infer<typeof schema>;

export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invite = useInviteMember();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { first_name: '', last_name: '', email: '', job_title: '', hired_on: todayIso() },
  });
  const e = form.formState.errors;

  const close = (o: boolean) => {
    onOpenChange(o);
    if (!o) {
      form.reset();
      setError(null);
      setSent(null);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await invite.mutateAsync(values);
      setSent(values.email);
    } catch (err) {
      setError(toUserMessage(err));
    }
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Inviter un collaborateur"
        description="Il recevra un e-mail pour définir lui-même son mot de passe."
        footer={
          sent ? (
            <Button variant="primary" onClick={() => close(false)}>
              Fermer
            </Button>
          ) : (
            <>
              <Button onClick={() => close(false)}>Annuler</Button>
              <Button variant="primary" type="submit" form="invite-form" disabled={invite.isPending}>
                Envoyer l’invitation
              </Button>
            </>
          )
        }
      >
        {sent ? (
          <div className="flex flex-col gap-2">
            <p className="text-base">
              Invitation envoyée à <span className="font-medium">{sent}</span>.
            </p>
            {isLocalBackend && (
              <Link to="/boite-mail" className="text-sm text-accent hover:underline">
                Voir l’e-mail dans la boîte de démonstration
              </Link>
            )}
          </div>
        ) : (
          <form id="invite-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Prénom" error={e.first_name?.message}>
                <Input autoComplete="off" {...form.register('first_name')} />
              </Field>
              <Field label="Nom" error={e.last_name?.message}>
                <Input autoComplete="off" {...form.register('last_name')} />
              </Field>
            </div>
            <Field label="Adresse e-mail professionnelle" error={e.email?.message}>
              <Input type="email" autoComplete="off" {...form.register('email')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Poste" error={e.job_title?.message}>
                <Input placeholder="Technicien SAV" {...form.register('job_title')} />
              </Field>
              <Field label="Date d’arrivée" error={e.hired_on?.message}>
                <Input type="date" {...form.register('hired_on')} />
              </Field>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
