import { Pause, Play, RotateCcw, Target } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Checkbox, Segmented, SegmentedItem, Switch } from '@/shared/ui/toggle';
import type { Review } from '../api';
import { useReviewPrep, useSaveReviewPrep, useUpdateReview } from '../queries';

const CHECKLIST = ['Porte fermée', 'Téléphone décroché', 'Smartphone en mode avion', 'Minuteur lancé', 'Sourire', 'Écouter'];

const PHASES = [
  {
    id: 'collaborateur',
    label: '1 · Lui',
    title: 'Le collaborateur parle',
    rule: 'Ne pas parler · prendre des notes · ne pas résoudre. Cette partie est prioritaire sur les autres.',
    prompts: ['Comment vas-tu ?', 'Je t’écoute…', 'Pas de problème particulier ?', 'Comment est l’ambiance en ce moment ?', 'As-tu des inquiétudes ?'],
  },
  {
    id: 'manager',
    label: '2 · Moi',
    title: 'Le manager rassure et pilote',
    rule: 'Répondre aux demandes (« je te reviens d’ici mardi » est une vraie réponse), partager les informations, donner le feedback préparé.',
    prompts: ['Quand tu… Voilà ce qui se passe… Peux-tu… ?', 'De quelle aide as-tu besoin ?', 'Toi, qu’est-ce que tu as prévu de faire ?'],
  },
  {
    id: 'developpement',
    label: '3 · Progrès',
    title: 'Développement et engagement',
    rule: 'Délégation, coaching, objectifs. Terminer par une priorité, un objectif SMART et des engagements des deux côtés.',
    prompts: ['Parmi tout ce que nous avons évoqué, quelle est la priorité d’ici notre prochain point ?', 'De quoi as-tu besoin de moi pour réussir ?', 'Tu peux me résumer ce que tu vas faire d’ici notre prochain point ?'],
  },
] as const;

const PHASE_SECONDS = 600;
const mmss = (s: number) => `${String(Math.floor(Math.abs(s) / 60)).padStart(2, '0')}:${String(Math.abs(s) % 60).padStart(2, '0')}`;

/** Conduite du 1 à 1 (kit Keylia) : check-list, 3 × 10 minutes chronométrées, engagement final. */
export function OneToOneGuide({ review, locked }: { review: Review; locked: boolean }) {
  const prep = useReviewPrep(review.id);
  const savePrep = useSaveReviewPrep(review.id);
  const update = useUpdateReview(review.id);
  const [phase, setPhase] = useState<(typeof PHASES)[number]['id']>('collaborateur');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState<Record<string, number>>({});
  const [priority, setPriority] = useState(review.priority);

  useEffect(() => setPriority(review.priority), [review.priority]);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed((e) => ({ ...e, [phase]: (e[phase] ?? 0) + 1 })), 1000);
    return () => window.clearInterval(t);
  }, [running, phase]);

  const checked = new Set((prep.data?.checklist as string[] | undefined) ?? []);
  const toggle = (item: string) => {
    const next = new Set(checked);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    savePrep.mutate({ checklist: [...next] });
  };
  const current = PHASES.find((p) => p.id === phase) ?? PHASES[0];
  const left = PHASE_SECONDS - (elapsed[phase] ?? 0);

  return (
    <Panel title="Conduire le 1 à 1" description="30 minutes, sans ordinateur ouvert pendant l’échange : notez sur téléphone ou papier.">
      <div className="flex flex-col gap-5">
        {!locked && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Avant de commencer</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHECKLIST.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={checked.has(item)} onCheckedChange={() => toggle(item)} />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {!locked && (
          <section className="flex flex-col gap-3 rounded-lg border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented value={phase} onValueChange={(v) => setPhase(v as typeof phase)} aria-label="Partie du 1 à 1">
                {PHASES.map((p) => (
                  <SegmentedItem key={p.id} value={p.id}>
                    {p.label}
                  </SegmentedItem>
                ))}
              </Segmented>
              <div className="flex items-center gap-2">
                <span className={cn('tabular text-lg font-semibold', left < 0 ? 'text-danger' : left < 60 ? 'text-warning' : 'text-fg')} aria-live="polite">
                  {left < 0 ? '+' : ''}
                  {mmss(left)}
                </span>
                <Button size="icon-sm" aria-label={running ? 'Mettre en pause' : 'Lancer le minuteur'} onClick={() => setRunning((r) => !r)}>
                  {running ? <Pause aria-hidden /> : <Play aria-hidden />}
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Remettre à zéro" onClick={() => setElapsed((e) => ({ ...e, [phase]: 0 }))}>
                  <RotateCcw aria-hidden />
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-medium">{current.title}</h3>
              <p className="text-sm text-fg-muted">{current.rule}</p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {current.prompts.map((q) => (
                <li key={q} className="rounded-full bg-sec-reviews/10 px-3 py-1 text-sm text-sec-reviews">
                  {q}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">L’engagement de fin</h3>
          <Field label="Priorité d’ici le prochain 1 à 1" hint="1 à 3 priorités maximum. Quoi ? Combien ? Quand ? Qui fait quoi ?">
            <Input
              value={priority}
              maxLength={300}
              readOnly={locked}
              placeholder="Ex. : livrer le module agenda partagé vendredi, avec Mehdi en relecture"
              onChange={(e) => setPriority(e.target.value)}
              onBlur={() => priority !== review.priority && update.mutate({ priority })}
            />
          </Field>
          <label className="flex items-start gap-3">
            <Switch
              checked={!!review.reformulated_at}
              disabled={locked}
              onCheckedChange={(v) => update.mutate({ reformulated_at: v ? new Date().toISOString() : null })}
              className="mt-px"
            />
            <span className="flex flex-col">
              <span className="text-base font-medium">Le collaborateur a reformulé ses engagements</span>
              <span className="text-xs text-fg-subtle">« Tu peux me résumer ce que tu vas faire d’ici notre prochain point ? »</span>
            </span>
          </label>
          {!locked && (
            <Button asChild size="sm" className="self-start">
              <Link to="/objectifs?nouveau=1">
                <Target aria-hidden />
                Transformer en objectif SMART
              </Link>
            </Button>
          )}
        </section>
      </div>
    </Panel>
  );
}
