import { useEffect, useState } from 'react';
import { useTeamMembers } from '@/features/team/queries';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect, Textarea } from '@/shared/ui/input';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { AUTONOMY, useSaveMission, type Mission, type MissionInput } from '../queries';

const empty = (person = ''): MissionInput => ({
  collaborator_id: person,
  title: '',
  expected_result: '',
  limits: '',
  support: '',
  checkpoints: '',
  due_date: isoAddDays(todayIso(), 30),
  autonomy: 2,
});

/** Confier une mission selon la méthode du cours : quoi, limites, temps, accompagnement, contrôle, autonomie. */
export function MissionDialog({ open, onOpenChange, mission, defaultPerson }: { open: boolean; onOpenChange: (o: boolean) => void; mission?: Mission | null; defaultPerson?: string }) {
  const team = useTeamMembers();
  const save = useSaveMission();
  const [m, setM] = useState<MissionInput>(empty());
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTried(false);
    setM(mission ? { ...mission } : empty(defaultPerson));
  }, [open, mission, defaultPerson]);

  const set = <K extends keyof MissionInput>(k: K, v: MissionInput[K]) => setM((x) => ({ ...x, [k]: v }));
  const valid = m.collaborator_id && m.title.trim().length >= 3;
  const submit = async () => {
    setTried(true);
    if (!valid) return;
    await save.mutateAsync({ ...m, id: mission?.id, title: m.title.trim(), due_date: m.due_date || null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title={mission ? 'Modifier la mission' : 'Confier une mission'}
        description="Déléguer, c’est confier la réalisation en restant responsable du résultat : assez de cadre pour sécuriser, assez de liberté pour responsabiliser."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button variant="primary" disabled={save.isPending} onClick={() => void submit()}>
              {mission ? 'Enregistrer' : 'Confier la mission'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="À qui ?" error={tried && !m.collaborator_id ? 'Choisissez un collaborateur.' : undefined} hint="Compétences actuelles, potentiel, motivation pour cette mission.">
              <NativeSelect value={m.collaborator_id} onChange={(e) => set('collaborator_id', e.target.value)}>
                <option value="">Choisir…</option>
                {team.active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Échéance">
              <Input type="date" value={m.due_date ?? ''} onChange={(e) => set('due_date', e.target.value)} />
            </Field>
          </div>
          <Field label="La mission" error={tried && m.title.trim().length < 3 ? 'Décrivez la mission.' : undefined}>
            <Input value={m.title} maxLength={160} onChange={(e) => set('title', e.target.value)} placeholder="Piloter l’astreinte de production" />
          </Field>
          <Field label="Le résultat attendu" hint="Livrables et niveau de qualité : une délégation floue génère des résultats flous.">
            <Textarea rows={2} maxLength={500} value={m.expected_result} onChange={(e) => set('expected_result', e.target.value)} />
          </Field>
          <Field label="Les limites" hint="Jusqu’où décide-t-il seul ? Quand revient-il vers vous ? Contraintes non négociables.">
            <Textarea rows={2} maxLength={500} value={m.limits} onChange={(e) => set('limits', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mon accompagnement" hint="Ressources, accès, obstacles que je lève.">
              <Textarea rows={2} maxLength={500} value={m.support} onChange={(e) => set('support', e.target.value)} />
            </Field>
            <Field label="Points de contrôle" hint="Suivre sans micro-manager.">
              <Textarea rows={2} maxLength={300} value={m.checkpoints} onChange={(e) => set('checkpoints', e.target.value)} placeholder="Point chaque lundi au 1 à 1" />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Note d’autonomie de départ</span>
            <Segmented value={String(m.autonomy)} onValueChange={(v) => set('autonomy', Number(v))} aria-label="Note d’autonomie" className="w-full">
              {Object.entries(AUTONOMY).map(([n, a]) => (
                <SegmentedItem key={n} value={n} className="flex-1 justify-center px-1">
                  {n}
                  <span className="hidden sm:inline">· {a.label}</span>
                </SegmentedItem>
              ))}
            </Segmented>
            <span className="text-xs text-fg-subtle">{AUTONOMY[m.autonomy]?.help}</span>
          </div>
          <p className="text-xs text-fg-subtle">
            Restent au manager : évaluation et feed-back, salaires, reconnaissance, questions personnelles et confidentielles, arbitrages stratégiques. Tout le reste peut être
            délégué : ne pas déléguer est un choix.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
