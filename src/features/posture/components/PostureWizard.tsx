import { ArrowRight, Check, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useObservations } from '@/features/notebook/queries';
import { pulseSignals } from '@/features/pulse/lib/pulse';
import { usePulses } from '@/features/pulse/queries';
import { useReviews } from '@/features/reviews/queries';
import { useTasks } from '@/features/tasks/queries';
import { useDiscProfiles } from '@/features/team/disc-queries';
import type { DiscStyle } from '@/features/team/lib/disc';
import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { fullName } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { NativeSelect, Textarea } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { DIAGNOSES, formAdvice, NEXT_STEP, SCARF, SCARF_DOMAINS, scarfRisks, suggestDiagnosis, type Diagnosis, type Scarf, type ScarfImpact } from '../lib/posture';
import { useSavePosture } from '../queries';
import { SituationFacts } from './SituationFacts';

const IMPACT: { value: ScarfImpact; label: string }[] = [
  { value: -1, label: 'Menacé' },
  { value: 0, label: 'Neutre' },
  { value: 1, label: 'Renforcé' },
];

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Panel title={`${n} · ${title}`}>
      <div className="flex flex-col gap-4">{children}</div>
    </Panel>
  );
}

/** Décider avec la bonne posture : faits → diagnostic → contrôle SCARF → forme DISC → décision. */
export function PostureWizard({ initialPerson }: { initialPerson: string }) {
  const team = useTeamMembers();
  const pulses = usePulses();
  const tasks = useTasks();
  const reviews = useReviews();
  const observations = useObservations();
  const discs = useDiscProfiles();
  const save = useSavePosture();
  const [person, setPerson] = useState(initialPerson);
  const [situation, setSituation] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [scarf, setScarf] = useState<Scarf>({});
  const [decision, setDecision] = useState('');
  const [saved, setSaved] = useState(false);
  const today = todayIso();

  const facts = useMemo(() => {
    const p = team.byId.get(person);
    if (!p) return null;
    const signals = pulseSignals(pulses.data ?? [], [p], today);
    const lateTasks = (tasks.data ?? []).filter((t) => t.assignee_id === person && t.status !== 'termine' && t.due_date !== null && t.due_date < today);
    const notes = (observations.data ?? []).filter((o) => o.collaborator_id === person).slice(0, 5);
    const last = (reviews.data ?? [])
      .filter((r) => r.collaborator_id === person && r.kind === 'one_to_one' && r.status === 'termine')
      .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
    const has = (k: string) => signals.some((s) => s.kind === k);
    const suggestion = suggestDiagnosis({
      moodDrop: has('moral_bas') || has('en_baisse'),
      lowEnergy: has('motivation_basse'),
      overload: has('surcharge'),
      silence: has('silence'),
      missedDeadlines: lateTasks.length,
    });
    return { p, signals, lateTasks, notes, last: last?.scheduled_at ?? null, suggestion };
  }, [person, team.byId, pulses.data, tasks.data, observations.data, reviews.data, today]);

  const disc = discs.data?.find((d) => d.collaborator_id === person);
  const chosen = diagnosis ?? facts?.suggestion?.diagnosis ?? null;
  const risks = scarfRisks(scarf);
  const reset = (id: string) => {
    setPerson(id);
    setSituation('');
    setDiagnosis(null);
    setScarf({});
    setDecision('');
    setSaved(false);
  };

  const submit = async () => {
    if (!person || !chosen || situation.trim().length < 3) return;
    await save.mutateAsync({ collaborator_id: person, situation: situation.trim(), diagnosis: chosen, scarf, decision: decision.trim(), next_step: DIAGNOSES[chosen].next });
    setSaved(true);
  };

  return (
    <div className="stagger flex flex-col gap-6">
      <Step n={1} title="Les faits">
        <Field label="Collaborateur concerné">
          <NativeSelect value={person} onChange={(e) => reset(e.target.value)}>
            <option value="">Choisir…</option>
            {team.active.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {facts && <SituationFacts signals={facts.signals} lateTasks={facts.lateTasks} observations={facts.notes} lastOneToOne={facts.last} />}
        <Field label="La situation, en faits" hint="Ce qu’une caméra aurait filmé : dates, livrables, comportements. Pas d’interprétation.">
          <Textarea rows={3} maxLength={1000} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="Depuis deux semaines, Hugo ne prend plus la parole au daily et a manqué deux échéances…" />
        </Field>
      </Step>

      <Step n={2} title="Le diagnostic : d’où vient l’écart ?">
        {facts?.suggestion && (
          <p className="text-sm text-fg-muted">
            <span className="font-medium text-fg">Hypothèse de départ : {DIAGNOSES[facts.suggestion.diagnosis].label}.</span> {facts.suggestion.reason} À vous de confirmer.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(DIAGNOSES) as Diagnosis[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDiagnosis(d)}
              aria-pressed={chosen === d}
              className={cn(
                'flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors',
                chosen === d ? 'border-sec-reviews bg-sec-reviews/10' : 'border-line hover:bg-surface-muted',
              )}
            >
              <span className="flex items-center gap-2 text-base font-medium">
                {chosen === d && <Check className="size-4 text-sec-reviews" aria-hidden />}
                {DIAGNOSES[d].label}
              </span>
              <span className="text-sm">{DIAGNOSES[d].question}</span>
              <span className="text-xs text-fg-subtle">{DIAGNOSES[d].signs}</span>
            </button>
          ))}
        </div>
        {chosen && (
          <div className="flex flex-col gap-1 rounded border border-sec-reviews/20 bg-sec-reviews/10 p-3 text-sm">
            <span className="font-medium">Réponse adaptée : {DIAGNOSES[chosen].response}</span>
            <span>Posture : {DIAGNOSES[chosen].posture}</span>
            <span className="text-xs text-fg-subtle">Outil du cours : {DIAGNOSES[chosen].tool}</span>
          </div>
        )}
      </Step>

      <Step n={3} title="Ma décision, passée au filtre SCARF">
        <Field label="Ce que je décide" hint="Une décision concrète, avec la prochaine étape et sa date.">
          <Textarea rows={2} maxLength={1000} value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Un 1 à 1 dès demain, centré sur lui, avant toute remarque sur les délais." />
        </Field>
        <ul className="flex flex-col divide-y divide-line">
          {SCARF_DOMAINS.map((d) => (
            <li key={d} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex flex-col">
                <span className="text-sm font-medium">{SCARF[d].label}</span>
                <span className="text-xs text-fg-subtle">{SCARF[d].question}</span>
              </span>
              <Segmented value={String(scarf[d] ?? 0)} onValueChange={(v) => setScarf((s) => ({ ...s, [d]: Number(v) as ScarfImpact }))} aria-label={SCARF[d].label}>
                {IMPACT.map((i) => (
                  <SegmentedItem key={i.value} value={String(i.value)}>
                    {i.label}
                  </SegmentedItem>
                ))}
              </Segmented>
            </li>
          ))}
        </ul>
        {risks.length > 0 && (
          <div className="flex flex-col gap-2 rounded border border-warning/20 bg-warning-subtle p-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-warning">
              <ShieldAlert className="size-4" aria-hidden />
              Réactions de défense possibles : prévoyez la parade
            </span>
            {risks.map((r) => (
              <span key={r.domain}>
                <span className="font-medium">{r.label} : </span>
                {r.mitigation}
              </span>
            ))}
          </div>
        )}
      </Step>

      <Step n={4} title="La forme : adaptée à son profil DISC">
        <p className="text-sm">{formAdvice((disc?.primary_style as DiscStyle | undefined) ?? null)}</p>
        <p className="text-xs text-fg-subtle">On ne change pas l’autre : on ajuste sa communication. Faits, demande et conséquences restent identiques.</p>
        {saved && chosen ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-success">Décision notée dans votre journal.</span>
            <Button asChild variant="primary">
              <Link to={NEXT_STEP[DIAGNOSES[chosen].next].to(person)}>
                {NEXT_STEP[DIAGNOSES[chosen].next].label}
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        ) : (
          <Button variant="primary" className="self-start" disabled={!person || !chosen || situation.trim().length < 3 || save.isPending} onClick={() => void submit()}>
            Enregistrer ma décision
          </Button>
        )}
      </Step>
    </div>
  );
}
