import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTeamMembers } from '@/features/team/queries';
import { useSquads } from '@/features/team/squads';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/toggle';
import { SmartCheck } from './SmartCheck';
import { useCreateObjective } from '../queries';
import { askAiFor } from '@/features/ai/client';
import { AiButton } from '@/features/ai/components/AiButton';
import { parseSmart, smartPrompt } from '@/features/ai/lib/ai';
import { toast } from '@/shared/ui/toaster';

// Contraintes alignées sur la base : longueurs, échéance ≥ début, cible ≠ départ.
const schema = z
  .object({
    title: z.string().trim().min(3, '3 caractères minimum.').max(160),
    description: z.string().max(2000),
    owner_id: z.string(),
    means: z.string().max(500),
    agreed: z.boolean(),
    start_date: z.string().min(1, 'Date requise.'),
    due_date: z.string().min(1, 'Date requise.'),
    keyResults: z
      .array(
        z
          .object({
            title: z.string().trim().min(3, '3 caractères minimum.').max(200),
            unit: z.string().trim().max(20),
            start_value: z.coerce.number(),
            target_value: z.coerce.number(),
          })
          .refine((k) => k.target_value !== k.start_value, {
            path: ['target_value'],
            message: 'La cible doit différer du départ.',
          }),
      )
      .min(1, 'Ajoutez au moins un résultat clé.'),
  })
  .refine((v) => v.due_date >= v.start_date, {
    path: ['due_date'],
    message: 'L’échéance doit suivre la date de début.',
  });
type Values = z.infer<typeof schema>;

export function ObjectiveDialog({
  open,
  onOpenChange,
  defaultOwner,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultOwner?: string;
}) {
  const team = useTeamMembers();
  const squads = useSquads();
  const create = useCreateObjective();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      owner_id: '',
      means: '',
      agreed: false,
      start_date: todayIso(),
      due_date: isoAddDays(todayIso(), 90),
      keyResults: [{ title: '', unit: '%', start_value: 0, target_value: 100 }],
    },
  });
  const krs = useFieldArray({ control: form.control, name: 'keyResults' });
  const e = form.formState.errors;
  useEffect(() => {
    if (open && defaultOwner) form.setValue('owner_id', defaultOwner);
  }, [open, defaultOwner, form]);
  const w = form.watch();
  const smartWithAi = async () => {
    const out = await askAiFor(
      smartPrompt({
        title: w.title ?? '',
        description: w.description ?? '',
        firstName: team.byId.get(w.owner_id ?? '')?.first_name,
        dueDate: w.due_date,
      }),
      parseSmart,
    );
    form.setValue('title', out.title, { shouldValidate: true });
    if (out.description) form.setValue('description', out.description);
    if (out.means) form.setValue('means', out.means);
    if (out.keyResults.length) krs.replace(out.keyResults);
    toast.success('Proposition SMART de l’IA : relisez les chiffres et l’échéance.');
  };

  const onSubmit = form.handleSubmit(async (v) => {
    await create.mutateAsync({
      objective: {
        title: v.title,
        description: v.description,
        // « equipe:<id> » : objectif commun à une équipe ; vide : toute l'équipe ; sinon : une personne.
        scope: v.owner_id && !v.owner_id.startsWith('equipe:') ? 'individuel' : 'equipe',
        owner_id: v.owner_id && !v.owner_id.startsWith('equipe:') ? v.owner_id : null,
        squad_id: v.owner_id.startsWith('equipe:') ? v.owner_id.slice('equipe:'.length) : null,
        means: v.means.trim(),
        agreed: v.agreed,
        start_date: v.start_date,
        due_date: v.due_date,
      },
      keyResults: v.keyResults.map((k) => ({ ...k, current_value: k.start_value })),
    });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title="Nouvel objectif"
        description="Spécifique, Mesurable, Atteignable, Réaliste, Temporel : il porte sur le résultat attendu, pas seulement sur l’action."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              type="submit"
              form="objective-form"
              variant="primary"
              disabled={create.isPending}
            >
              Créer l’objectif
            </Button>
          </>
        }
      >
        <form id="objective-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <Field label="Intitulé" error={e.title?.message}>
            <Input
              {...form.register('title')}
              placeholder="Publier l’application mobile 3.0 sur les deux stores"
            />
          </Field>
          <AiButton
            label="Rendre SMART avec l’IA"
            className="self-start"
            disabled={(w.title ?? '').trim().length < 3}
            run={smartWithAi}
          />
          <Field label="Description" optional>
            <Textarea rows={2} {...form.register('description')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Pour qui ?" hint="Une personne, une équipe ou tout le monde">
              <NativeSelect {...form.register('owner_id')}>
                <option value="">Toute l’équipe</option>
                {!!squads.data?.length && (
                  <optgroup label="Une équipe (objectif commun)">
                    {squads.data.map((sq) => (
                      <option key={sq.id} value={`equipe:${sq.id}`}>
                        Équipe {sq.name} ({team.active.filter((p) => p.squad_id === sq.id).length})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Une personne">
                  {team.active.map((p) => (
                    <option key={p.id} value={p.id}>
                      {fullName(p)}
                    </option>
                  ))}
                </optgroup>
              </NativeSelect>
            </Field>
            <Field label="Début" error={e.start_date?.message}>
              <Input type="date" {...form.register('start_date')} />
            </Field>
            <Field label="Échéance" error={e.due_date?.message}>
              <Input type="date" {...form.register('due_date')} />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-3">
            <legend className="pb-2 text-sm font-medium">Résultats clés</legend>
            {krs.fields.map((f, i) => (
              <div
                key={f.id}
                className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_80px_96px_96px_32px]"
              >
                <Field label="Intitulé" error={e.keyResults?.[i]?.title?.message}>
                  <Input {...form.register(`keyResults.${i}.title`)} />
                </Field>
                <Field label="Unité">
                  <Input {...form.register(`keyResults.${i}.unit`)} />
                </Field>
                <Field label="Départ">
                  <Input
                    type="number"
                    step="any"
                    className="tabular text-right"
                    {...form.register(`keyResults.${i}.start_value`)}
                  />
                </Field>
                <Field label="Cible" error={e.keyResults?.[i]?.target_value?.message}>
                  <Input
                    type="number"
                    step="any"
                    className="tabular text-right"
                    {...form.register(`keyResults.${i}.target_value`)}
                  />
                </Field>
                <Button
                  size="icon"
                  variant="ghost"
                  className="mt-6"
                  aria-label="Retirer ce résultat clé"
                  disabled={krs.fields.length === 1}
                  onClick={() => krs.remove(i)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              className="self-start"
              onClick={() => krs.append({ title: '', unit: '', start_value: 0, target_value: 10 })}
            >
              <Plus aria-hidden />
              Ajouter un résultat clé
            </Button>
          </fieldset>
          <Field
            label="Les moyens que j’apporte"
            hint="« De quoi as-tu besoin de moi pour réussir ? » Responsabiliser ne signifie pas laisser seul."
            optional
          >
            <Textarea
              rows={2}
              maxLength={500}
              {...form.register('means')}
              placeholder="Temps dédié, binôme, formation, arbitrage des priorités…"
            />
          </Field>
          <Controller
            control={form.control}
            name="agreed"
            render={({ field }) => (
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  className="mt-1"
                />
                <span className="flex flex-col">
                  <span className="text-base font-medium">
                    Discuté et accepté par le collaborateur
                  </span>
                  <span className="text-xs text-fg-subtle">
                    Il l’a reformulé et y croit : c’est ce qui le rend atteignable.
                  </span>
                </span>
              </label>
            )}
          />
          <SmartCheck
            input={{
              title: w.title ?? '',
              description: w.description ?? '',
              keyResults: (w.keyResults ?? []).filter((k) => (k.title ?? '').trim().length >= 3)
                .length,
              means: w.means ?? '',
              agreed: !!w.agreed,
              startDate: w.start_date ?? '',
              dueDate: w.due_date ?? '',
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
