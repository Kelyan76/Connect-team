import { AlertTriangle, Lightbulb } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OBS_TONE, useObservations, type ObservationTone } from '@/features/notebook/queries';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { DISC, type DiscStyle } from '@/features/team/lib/disc';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Field } from '@/shared/ui/field';
import { NativeSelect, Textarea } from '@/shared/ui/input';
import { Segmented, SegmentedItem, Switch } from '@/shared/ui/toggle';
import { composeFeedback, DESC_STEPS, emptyDesc, FEEDBACK_TYPES, lintFeedback, missingSteps, type CourseFeedbackKind, type DescParts, type DescStep } from '../lib/desc';
import { useCreateFeedback } from '../queries';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultPerson?: string;
  defaultKind?: CourseFeedbackKind;
}

/** Rédaction guidée d'un feedback : type (reconnaissance, amélioration, recadrage), méthode DESC, pièges, forme DISC. */
export function FeedbackDialog({ open, onOpenChange, defaultPerson, defaultKind }: Props) {
  const team = useTeamMembers();
  const create = useCreateFeedback();
  const discs = useDiscProfiles();
  const observations = useObservations(open);
  const [person, setPerson] = useState('');
  const [kind, setKind] = useState<CourseFeedbackKind>('reconnaissance');
  const [parts, setParts] = useState<DescParts>(emptyDesc());
  const [shared, setShared] = useState(true);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    const k = defaultKind ?? 'reconnaissance';
    setPerson(defaultPerson ?? '');
    setKind(k);
    setParts(emptyDesc());
    setShared(k !== 'recadrage');
    setTried(false);
  }, [open, defaultPerson, defaultKind]);

  const type = FEEDBACK_TYPES[kind];
  const issues = useMemo(() => lintFeedback(kind, parts), [kind, parts]);
  const missing = missingSteps(kind, parts);
  const disc = discs.data?.find((d) => d.collaborator_id === person);
  const facts = (observations.data ?? []).filter((o) => o.collaborator_id === person).slice(0, 3);
  const message = composeFeedback(kind, parts);

  const changeKind = (k: string) => {
    const next = k as CourseFeedbackKind;
    setKind(next);
    setShared(next !== 'recadrage');
  };
  const set = (step: DescStep, value: string) => setParts((p) => ({ ...p, [step]: value }));

  const submit = async () => {
    setTried(true);
    if (!person || missing.length) return;
    const used = type.steps;
    await create.mutateAsync({
      collaborator_id: person,
      kind,
      body: message.slice(0, 2000),
      is_shared: shared,
      desc_d: parts.d.trim(),
      desc_e: parts.e.trim(),
      desc_s: used.includes('s') ? parts.s.trim() : '',
      desc_c: used.includes('c') ? parts.c.trim() : '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title="Préparer un feedback"
        description="Méthode DESC : des faits, pas des jugements, tourné vers la suite."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button variant="primary" disabled={create.isPending} onClick={() => void submit()}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Type de feedback</span>
              <Segmented value={kind} onValueChange={changeKind} aria-label="Type de feedback" className="w-full">
                {(Object.keys(FEEDBACK_TYPES) as CourseFeedbackKind[]).map((k) => (
                  <SegmentedItem key={k} value={k} className="flex-1 justify-center">
                    {FEEDBACK_TYPES[k].label}
                  </SegmentedItem>
                ))}
              </Segmented>
            </div>
          </div>
          <p className="text-sm text-fg-muted">
            <span className="font-medium text-fg">{type.when}.</span> But : {type.goal.toLowerCase()}. {kind === 'reconnaissance' && 'D et E suffisent.'}
          </p>

          {person && (
            <div className="flex gap-3 rounded border border-line bg-surface-muted/50 px-3 py-2 text-sm">
              <Lightbulb className="mt-px size-4 shrink-0 text-accent" aria-hidden />
              {disc ? (
                <span>
                  <span className="font-medium">Profil {disc.primary_style} · {DISC[disc.primary_style as DiscStyle].name}</span> : {DISC[disc.primary_style as DiscStyle].do}{' '}
                  <span className="text-fg-muted">À éviter : {DISC[disc.primary_style as DiscStyle].avoid}</span>
                </span>
              ) : (
                <span className="text-fg-muted">Profil DISC non renseigné : remplissez-le avec lui pour adapter la forme.</span>
              )}
            </div>
          )}

          {facts.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Partir d’un fait noté dans votre carnet</span>
              <div className="flex flex-col gap-1">
                {facts.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set('d', `Le ${formatDate(o.observed_on)}, ${o.body.charAt(0).toLowerCase()}${o.body.slice(1)}`)}
                    className="flex items-start gap-2 rounded px-2 py-1 text-left text-sm hover:bg-surface-muted"
                  >
                    <span className={`mt-2 size-2 shrink-0 rounded-full ${OBS_TONE[o.tone as ObservationTone].dot}`} aria-hidden />
                    <span>
                      <span className="text-fg-subtle">{formatDate(o.observed_on)} · </span>
                      {o.body}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {type.steps.map((step) => {
            const meta = DESC_STEPS[step];
            const stepIssues = issues.filter((i) => i.step === step);
            return (
              <div key={step} className="flex flex-col gap-1">
                <Field label={`${meta.letter} · ${meta.label}`} hint={meta.hint} error={tried && missing.includes(step) ? 'Étape à compléter.' : undefined}>
                  <Textarea rows={2} value={parts[step]} onChange={(e) => set(step, e.target.value)} placeholder={meta.placeholder} maxLength={1000} />
                </Field>
                {stepIssues.map((i) => (
                  <span key={i.id} className="flex items-start gap-2 text-xs text-warning">
                    <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
                    <span>
                      <span className="font-medium">{i.title}.</span> {i.advice}
                    </span>
                  </span>
                ))}
              </div>
            );
          })}

          {kind !== 'reconnaissance' && (
            <p className="text-xs text-fg-subtle">
              Le DESC ne règle pas un manque de compétence ou de moyens. En cas de doute, faites d’abord le{' '}
              <Link to="/posture" className="text-accent hover:underline">
                diagnostic Comprendre / Savoir / Pouvoir / Vouloir
              </Link>
              . Puis toujours : reformulation par le collaborateur, engagement et date de point.
            </p>
          )}

          {message && (
            <div className="flex flex-col gap-1 rounded border border-line px-3 py-2">
              <span className="text-xs font-medium text-fg-subtle">Ce que vous direz</span>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <label className="flex items-start gap-3">
            <Switch checked={shared} onCheckedChange={setShared} className="mt-px" />
            <span className="flex flex-col">
              <span className="text-base font-medium">Partager avec le collaborateur</span>
              <span className="text-xs text-fg-subtle">
                {kind === 'recadrage'
                  ? 'Un recadrage se dit d’abord en face à face, en privé : partagez-le après l’échange.'
                  : 'Sinon, il reste privé et sert à préparer votre prochain 1 à 1.'}
              </span>
            </span>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
