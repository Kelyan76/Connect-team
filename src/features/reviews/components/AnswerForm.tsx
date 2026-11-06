import { Check } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import type { Answer, Question, Review } from '../api';
import type { AnswerValue } from '../lib/review-rules';
import { useSaveAnswer, useSubmitPreparation } from '../queries';
import { QuestionInput } from './QuestionInput';

interface Props {
  review: Review;
  questions: Question[];
  answers: Answer[];
  author: 'manager' | 'collaborateur';
  editable: boolean;
}

/** Préparation d'une partie : enregistrement automatique à chaque réponse, puis validation. */
export function AnswerForm({ review, questions, answers, author, editable }: Props) {
  const save = useSaveAnswer(review.id, author);
  const submit = useSubmitPreparation(review.id);
  const [confirm, setConfirm] = useState(false);
  const mine = new Map(answers.filter((a) => a.author === author).map((a) => [a.question_key, a.value as AnswerValue]));
  const preparedAt = author === 'manager' ? review.manager_prepared_at : review.collaborator_prepared_at;
  const answered = questions.filter((q) => {
    const v = mine.get(q.key);
    return v !== undefined && v !== null && v !== '';
  }).length;
  const sections = [...new Set(questions.map((q) => q.section))];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="flex flex-col">
          <span className="text-base font-medium">
            {preparedAt ? 'Préparation validée' : `${answered} réponse${answered > 1 ? 's' : ''} sur ${questions.length}`}
          </span>
          <span className="text-xs text-fg-subtle">
            {preparedAt
              ? `Le ${formatDateTime(preparedAt)}.${author === 'collaborateur' ? ' Vos réponses ne sont plus modifiables.' : ''}`
              : author === 'manager'
                ? 'Vos réponses restent invisibles pour le collaborateur tant que les deux préparations ne sont pas validées.'
                : 'Enregistrement automatique. Votre manager verra vos réponses une fois votre préparation validée.'}
          </span>
        </div>
        {!preparedAt && (
          <Button variant="primary" onClick={() => setConfirm(true)} disabled={answered === 0}>
            <Check aria-hidden />
            Valider ma préparation
          </Button>
        )}
      </div>

      {sections.map((section) => (
        <section key={section} className="rounded-lg border border-line bg-surface">
          {section && <h2 className="border-b border-line px-4 py-3 text-base font-semibold">{section}</h2>}
          <div className="flex flex-col divide-y divide-line">
            {questions
              .filter((q) => q.section === section)
              .map((q) => (
                <div key={q.key} className="flex flex-col gap-2 px-4 py-4">
                  <QuestionInput
                    question={q}
                    value={mine.get(q.key)}
                    disabled={!editable}
                    onSave={(value) => save.mutate({ key: q.key, value })}
                  />
                </div>
              ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Valider votre préparation ?"
        description={
          author === 'collaborateur'
            ? 'Vos réponses seront transmises à votre manager et ne pourront plus être modifiées.'
            : 'Votre préparation sera marquée comme terminée. Vous pourrez encore ajuster vos réponses jusqu’à la signature.'
        }
        confirmLabel="Valider"
        destructive={false}
        pending={submit.isPending}
        onConfirm={() => submit.mutate(undefined, { onSettled: () => setConfirm(false) })}
      />
    </div>
  );
}
