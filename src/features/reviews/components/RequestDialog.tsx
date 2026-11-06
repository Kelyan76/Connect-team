import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, Textarea } from '@/shared/ui/input';
import { useCreateRequest } from '../queries';

/** Demande de one-to-one par le collaborateur. */
export function RequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { profile, team } = useCurrentUser();
  const create = useCreateRequest();
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(isoAddDays(todayIso(), 5));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Demander un one-to-one"
        description="Votre manager reçoit la demande et vous propose un créneau."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              variant="primary"
              disabled={create.isPending}
              onClick={() =>
                create.mutate(
                  { collaborator_id: profile.id, team_id: team.id, message: message.trim(), preferred_date: date || null },
                  {
                    onSuccess: () => {
                      setMessage('');
                      onOpenChange(false);
                    },
                  },
                )
              }
            >
              Envoyer la demande
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Sujet à aborder" optional hint="1 000 caractères maximum.">
            <Textarea rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Date souhaitée" optional>
            <Input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
