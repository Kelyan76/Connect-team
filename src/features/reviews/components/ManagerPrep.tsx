import { ArrowRight, Check, ClipboardList, Compass, Eye } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import type { Answer, Question, Review } from '../api';
import { canEditOwnAnswers } from '../lib/review-rules';
import { AnswerForm } from './AnswerForm';
import { CollaboratorTopics } from './CollaboratorTopics';
import { KeyliaPrep } from './KeyliaPrep';
import { PrepAssistant } from './PrepAssistant';

type Step = 'situation' | 'plan' | 'trame';

interface Props {
  review: Review;
  questions: Question[];
  answers: Answer[];
  firstName: string;
}

const filled = (v: Answer['value']) =>
  v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

/**
 * Préparation du manager en 3 étapes, une à la fois :
 * 1. où en est le collaborateur (ses sujets, ses données, les sujets suggérés) ;
 * 2. mon plan (kit Keylia : faits observés, thème de progrès, message, posture) ;
 * 3. mes réponses à la trame, puis validation.
 */
export function ManagerPrep({ review, questions, answers, firstName }: Props) {
  const oneToOne = review.kind === 'one_to_one';
  const [step, setStep] = useState<Step>('situation');
  const mine = answers.filter((a) => a.author === 'manager' && filled(a.value)).length;

  const steps: { id: Step; label: string; icon: typeof Eye; status: string; done: boolean }[] = [
    {
      id: 'situation',
      label: `Où en est ${firstName}`,
      icon: Eye,
      status: review.collaborator_prepared_at
        ? `${firstName} a préparé`
        : 'Sa préparation est attendue',
      done: !!review.collaborator_prepared_at,
    },
    ...(oneToOne
      ? [
          {
            id: 'plan' as const,
            label: 'Mon plan',
            icon: Compass,
            status: 'Kit Keylia, 5 minutes',
            done: false,
          },
        ]
      : []),
    {
      id: 'trame',
      label: 'Mes réponses',
      icon: ClipboardList,
      status: review.manager_prepared_at
        ? 'Préparation validée'
        : `${mine} / ${questions.length} réponses`,
      done: !!review.manager_prepared_at,
    },
  ];
  const index = steps.findIndex((s) => s.id === step);
  const next = steps[index + 1];

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Étapes de préparation">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(s.id)}
              aria-current={s.id === step ? 'step' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                s.id === step
                  ? 'border-accent bg-accent-subtle'
                  : 'border-line bg-surface hover:bg-surface-muted',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  s.done
                    ? 'bg-success text-white'
                    : s.id === step
                      ? 'bg-accent text-accent-fg'
                      : 'bg-surface-muted text-fg-muted',
                )}
              >
                {s.done ? <Check className="size-4" aria-hidden /> : i + 1}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base font-medium">{s.label}</span>
                <span className="truncate text-xs text-fg-subtle">{s.status}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div key={step} className="flex animate-page-in flex-col gap-6">
        {step === 'situation' && (
          <>
            {oneToOne && (
              <CollaboratorTopics review={review} answers={answers} firstName={firstName} />
            )}
            <PrepAssistant review={review} />
          </>
        )}
        {step === 'plan' && <KeyliaPrep review={review} />}
        {step === 'trame' && (
          <AnswerForm
            review={review}
            questions={questions}
            answers={answers}
            author="manager"
            editable={canEditOwnAnswers('manager', review)}
          />
        )}
      </div>

      {next && (
        <Button variant="primary" className="self-end" onClick={() => setStep(next.id)}>
          Étape suivante : {next.label}
          <ArrowRight aria-hidden />
        </Button>
      )}
    </div>
  );
}
