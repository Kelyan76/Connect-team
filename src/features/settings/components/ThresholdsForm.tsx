import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { useSaveSettings, useSettings } from '../queries';

// Bornes identiques aux contraintes CHECK de team_settings.
const n = (min: number, max: number) => z.coerce.number().int('Nombre entier.').min(min, `Minimum ${min}.`).max(max, `Maximum ${max}.`);
const schema = z.object({
  no_one_to_one_days: n(7, 120),
  overload_pct: n(80, 150),
  overload_weeks: n(1, 6),
  underload_pct: n(20, 90),
  weather_drop_weeks: n(2, 8),
  review_due_days: n(7, 90),
  prep_reminder_days: n(1, 14),
  max_absent: n(1, 20),
});
type Values = z.infer<typeof schema>;

const FIELDS: { key: keyof Values; label: string; unit: string; hint: string }[] = [
  { key: 'no_one_to_one_days', label: '1 à 1 manquant', unit: 'jours', hint: 'Alerte quand le dernier 1 à 1 date de plus de N jours.' },
  { key: 'overload_pct', label: 'Seuil de surcharge', unit: '%', hint: 'Charge hebdomadaire au-delà de laquelle on parle de surcharge.' },
  { key: 'overload_weeks', label: 'Durée de surcharge', unit: 'semaines', hint: 'Nombre de semaines consécutives avant alerte.' },
  { key: 'underload_pct', label: 'Seuil de sous-charge', unit: '%', hint: 'Signalé dans le plan de charge.' },
  { key: 'weather_drop_weeks', label: 'Baisse de l’humeur (pouls)', unit: 'semaines', hint: 'Humeur en recul chaque semaine pendant N semaines.' },
  { key: 'review_due_days', label: 'Échéance réglementaire', unit: 'jours', hint: 'Entretien annuel ou professionnel à planifier sous N jours.' },
  { key: 'prep_reminder_days', label: 'Rappel de préparation', unit: 'jours', hint: 'Rappel si l’entretien a lieu sous N jours et n’est pas prêt.' },
  { key: 'max_absent', label: 'Absences simultanées', unit: 'personnes', hint: 'Au-delà, le jour est signalé dans le calendrier.' },
];

export function ThresholdsForm({ teamId }: { teamId: string }) {
  const settings = useSettings();
  const save = useSaveSettings();
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (settings.data) form.reset(settings.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  if (!settings.data) return <Skeleton className="h-96" />;
  return (
    <Panel title="Seuils d’alerte" description="Les alertes et rappels sont recalculés immédiatement.">
      <form className="flex flex-col gap-6" onSubmit={form.handleSubmit((patch) => save.mutate({ teamId, patch }))} noValidate>
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint} error={form.formState.errors[f.key]?.message}>
              <div className="flex items-center gap-2">
                <Input type="number" className="tabular w-24 text-right" {...form.register(f.key)} />
                <span className="text-sm text-fg-muted">{f.unit}</span>
              </div>
            </Field>
          ))}
        </div>
        <Button type="submit" variant="primary" className="self-start" disabled={save.isPending || !form.formState.isDirty}>
          Enregistrer les seuils
        </Button>
      </form>
    </Panel>
  );
}
