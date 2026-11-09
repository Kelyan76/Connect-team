import { Check, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/input';
import type { Answer, Review } from '../api';
import { QUICK_KEYS, TOPICS, topicsToValue, valueToTopics } from '../lib/quick-prep';
import { useSaveAnswer, useSubmitPreparation } from '../queries';

/**
 * « Préparer mon 1 à 1 » en 2 minutes : les sujets dont je veux parler, ce qui va, ce qui coince.
 * Mon manager le lit une fois que je l'ai envoyé ; c'est mon 1 à 1 avant d'être le sien.
 */
export function QuickPrep({ review, answers, managerName }: { review: Review; answers: Answer[]; managerName: string }) {
  const save = useSaveAnswer(review.id, 'collaborateur');
  const submit = useSubmitPreparation(review.id);
  const mine = new Map(answers.filter((a) => a.author === 'collaborateur').map((a) => [a.question_key, a.value]));
  const sent = !!review.collaborator_prepared_at;
  const [topics, setTopics] = useState<string[]>([]);
  const [good, setGood] = useState('');
  const [stuck, setStuck] = useState('');

  useEffect(() => {
    setTopics(valueToTopics(mine.get(QUICK_KEYS.topics)));
    setGood(typeof mine.get(QUICK_KEYS.good) === 'string' ? (mine.get(QUICK_KEYS.good) as string) : '');
    setStuck(typeof mine.get(QUICK_KEYS.stuck) === 'string' ? (mine.get(QUICK_KEYS.stuck) as string) : '');
    // Initialisation à l'ouverture uniquement : la saisie en cours ne doit pas être écrasée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [review.id]);

  const toggle = (t: string) => {
    const next = topics.includes(t) ? topics.filter((x) => x !== t) : [...topics, t];
    setTopics(next);
    save.mutate({ key: QUICK_KEYS.topics, value: topicsToValue(next) });
  };
  const persist = (key: string, value: string, before: unknown) => value !== (before ?? '') && save.mutate({ key, value: value.trim() });
  const ready = topics.length > 0 || good.trim() || stuck.trim();

  if (sent) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-success/20 bg-success-subtle p-4">
        <span className="flex items-center gap-2 text-base font-medium text-success">
          <Check className="size-4" aria-hidden />
          Préparation envoyée à {managerName} le {formatDate(review.collaborator_prepared_at ?? '')}
        </span>
        {topics.length > 0 && <p className="text-sm">Mes sujets : {topics.join(', ')}</p>}
        {good && <p className="text-sm">Ce qui va : {good}</p>}
        {stuck && <p className="text-sm">Ce qui coince : {stuck}</p>}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-sec-reviews/20 bg-gradient-to-br from-sec-reviews/10 to-surface p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-md font-semibold">Préparer mon 1 à 1 en 2 minutes</h2>
        <p className="text-sm text-fg-muted">C’est votre moment : les 10 premières minutes vous appartiennent. {managerName} ne lira votre préparation qu’une fois envoyée.</p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">De quoi je veux parler</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => {
            const on = topics.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(t)}
                className={cn(
                  'inline-flex h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-all active:scale-95',
                  on ? 'border-sec-reviews bg-sec-reviews text-white shadow-sm' : 'border-line bg-surface text-fg-muted hover:text-fg',
                )}
              >
                {on && <Check className="size-4" aria-hidden />}
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ce qui va bien" optional>
          <Textarea rows={2} maxLength={500} value={good} onChange={(e) => setGood(e.target.value)} onBlur={() => persist(QUICK_KEYS.good, good, mine.get(QUICK_KEYS.good))} placeholder="Une réussite, un bon moment…" />
        </Field>
        <Field label="Ce qui coince" optional>
          <Textarea rows={2} maxLength={500} value={stuck} onChange={(e) => setStuck(e.target.value)} onBlur={() => persist(QUICK_KEYS.stuck, stuck, mine.get(QUICK_KEYS.stuck))} placeholder="Un blocage, une inquiétude…" />
        </Field>
      </div>
      <Button
        variant="primary"
        className="self-start"
        disabled={!ready || submit.isPending}
        onClick={() => {
          persist(QUICK_KEYS.good, good, mine.get(QUICK_KEYS.good));
          persist(QUICK_KEYS.stuck, stuck, mine.get(QUICK_KEYS.stuck));
          submit.mutate();
        }}
      >
        <Send aria-hidden />
        Envoyer à {managerName}
      </Button>
      <p className="text-xs text-fg-subtle">Vous pouvez aussi répondre aux questions détaillées ci-dessous avant d’envoyer.</p>
    </section>
  );
}
