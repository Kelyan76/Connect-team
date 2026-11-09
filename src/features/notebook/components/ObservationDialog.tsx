import { useEffect, useState } from 'react';
import { useTeamMembers } from '@/features/team/queries';
import { todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { OBS_TONE, useAddObservation, type ObservationTone } from '../queries';

/**
 * Noter un fait en moins de 30 secondes (kit 1 à 1 : « notez au fil de la semaine tout ce que vous repérez »).
 * Des faits observables, pas des jugements : ils serviront de base aux feedbacks et au prochain 1 à 1.
 */
export function ObservationDialog({ open, onOpenChange, defaultPerson }: { open: boolean; onOpenChange: (o: boolean) => void; defaultPerson?: string }) {
  const team = useTeamMembers();
  const add = useAddObservation();
  const [person, setPerson] = useState('');
  const [tone, setTone] = useState<ObservationTone>('neutre');
  const [body, setBody] = useState('');
  const [day, setDay] = useState(todayIso());
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPerson(defaultPerson ?? '');
    setTone('neutre');
    setBody('');
    setDay(todayIso());
    setTried(false);
  }, [open, defaultPerson]);

  const valid = person && body.trim().length >= 3;
  const submit = async () => {
    setTried(true);
    if (!valid) return;
    await add.mutateAsync({ collaborator_id: person, tone, body: body.trim(), observed_on: day });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Noter une observation"
        description="Un fait daté, ce qu’une caméra aurait filmé. Visible par vous seul."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button variant="primary" disabled={add.isPending} onClick={() => void submit()}>
              Noter
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <Field label="Collaborateur" error={tried && !person ? 'Choisissez un collaborateur.' : undefined}>
              <NativeSelect value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="">Choisir…</option>
                {team.active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Date">
              <Input type="date" value={day} max={todayIso()} onChange={(e) => setDay(e.target.value)} />
            </Field>
          </div>
          <Segmented value={tone} onValueChange={(v) => setTone(v as ObservationTone)} aria-label="Nature de l’observation" className="w-full">
            {(Object.keys(OBS_TONE) as ObservationTone[]).map((t) => (
              <SegmentedItem key={t} value={t} className="flex-1 justify-center">
                <span className={`size-2 rounded-full ${OBS_TONE[t].dot}`} aria-hidden />
                {OBS_TONE[t].label}
              </SegmentedItem>
            ))}
          </Segmented>
          <Field label="Ce que j’ai observé" error={tried && body.trim().length < 3 ? 'Décrivez le fait en quelques mots.' : undefined} hint={`${body.length} / 500`}>
            <Textarea rows={3} maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ex. : a présenté la démo seul en revue de sprint, réponses claires aux questions du client." />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
