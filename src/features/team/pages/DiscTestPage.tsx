import { ArrowLeft, Check, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/data';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { useSaveDisc } from '../disc-queries';
import { DISC, type DiscStyle } from '../lib/disc';
import { DISC_QUESTIONS, scoreDisc, type DiscResult } from '../lib/disc-test';

/** Test DISC en 2 minutes : une situation par écran, la réponse fait passer à la suivante. */
export default function DiscTestPage() {
  const { profile, isManager } = useCurrentUser();
  const save = useSaveDisc();
  const [answers, setAnswers] = useState<DiscStyle[]>([]);
  const [result, setResult] = useState<DiscResult | null>(null);
  const step = answers.length;
  const question = DISC_QUESTIONS[step];

  const choose = (style: DiscStyle) => {
    const next = [...answers, style];
    setAnswers(next);
    if (next.length === DISC_QUESTIONS.length) {
      const r = scoreDisc(next);
      setResult(r);
      save.mutate({ collaborator_id: profile.id, primary_style: r.primary, secondary_style: r.secondary, source: 'auto_evaluation', note: '' });
    }
  };
  const restart = () => {
    setAnswers([]);
    setResult(null);
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Mon profil', to: '/profil' }, { label: 'Mon style de communication' }]}
        title="Mon style de communication"
        description="8 situations, environ 2 minutes. Choisissez à chaque fois la phrase qui vous ressemble le plus : il n’y a pas de bonne réponse."
      />
      <div className="mx-auto flex w-full max-w-180 flex-col gap-6">
        {!result && question ? (
          <Panel>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <ProgressBar value={step / DISC_QUESTIONS.length} label="Avancement du test" />
                <span className="tabular shrink-0 text-sm text-fg-muted">
                  {step + 1} / {DISC_QUESTIONS.length}
                </span>
              </div>
              <h2 key={step} className="animate-page-in text-lg font-semibold">
                {question.prompt}
              </h2>
              <div key={`a${step}`} className="stagger flex flex-col gap-3">
                {question.answers.map((a) => (
                  <button
                    key={a.style}
                    type="button"
                    onClick={() => choose(a.style)}
                    className="rounded-lg border border-line bg-surface px-4 py-4 text-left text-base shadow-sm transition-all hover:border-accent hover:bg-accent-subtle active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {a.text}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setAnswers((x) => x.slice(0, -1))}>
                  <ArrowLeft aria-hidden />
                  Question précédente
                </Button>
              )}
            </div>
          </Panel>
        ) : result ? (
          <Panel>
            <div className="flex animate-page-in flex-col gap-5">
              <div className="flex items-center gap-4">
                <span className={cn('flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold', DISC[result.primary].soft)}>
                  {result.primary}
                  {result.secondary ?? ''}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm text-fg-muted">Votre style dominant</span>
                  <span className="text-xl font-semibold">
                    {DISC[result.primary].name}
                    {result.secondary && <span className="text-fg-muted">, {DISC[result.secondary].name.toLowerCase()}</span>}
                  </span>
                  <span className="text-sm text-fg-muted">{DISC[result.primary].short}</span>
                </span>
              </div>
              <p className="text-base">{DISC[result.primary].traits}</p>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-success">Ce qui vous aide</dt>
                  <dd className="text-sm">{DISC[result.primary].do}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-sm font-medium text-danger">Ce qui vous freine</dt>
                  <dd className="text-sm">{DISC[result.primary].avoid}</dd>
                </div>
              </dl>
              <div className="flex gap-1" aria-label="Vos réponses par style">
                {(['D', 'I', 'S', 'C'] as const).map((s) => (
                  <span key={s} className={cn('flex flex-1 flex-col items-center rounded py-2 text-xs', s === result.primary ? DISC[s].soft : 'bg-surface-muted text-fg-muted')}>
                    <span className="text-base font-semibold">{s}</span>
                    {result.scores[s]} / 8
                  </span>
                ))}
              </div>
              <p className="flex items-start gap-2 text-sm text-fg-muted">
                <Check className="mt-px size-4 shrink-0 text-success" aria-hidden />
                {save.isPending
                  ? 'Enregistrement…'
                  : isManager
                    ? 'Enregistré dans votre profil.'
                    : 'Enregistré : votre manager l’utilisera pour adapter la forme de ses échanges avec vous. Vous pouvez le corriger à tout moment dans Mon profil.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="primary">
                  <Link to="/">Revenir à l’accueil</Link>
                </Button>
                <Button onClick={restart}>
                  <RotateCcw aria-hidden />
                  Refaire le test
                </Button>
              </div>
            </div>
          </Panel>
        ) : null}
        <p className="text-xs text-fg-subtle">
          Auto-évaluation indicative inspirée du modèle DISC, pour mieux communiquer ensemble. Ce n’est ni une évaluation ni un test psychologique.
        </p>
      </div>
    </Page>
  );
}
