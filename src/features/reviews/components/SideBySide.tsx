import { AlertTriangle, EyeOff } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui/feedback';
import type { Answer, Question, Review } from '../api';
import { canSeeOtherSide, hasGap, type AnswerValue } from '../lib/review-rules';
import { formatAnswer } from '../lib/format-answer';

/** Réponses du collaborateur et du manager en regard, écarts d'appréciation mis en évidence. */
export function SideBySide({ review, questions, answers, viewer }: { review: Review; questions: Question[]; answers: Answer[]; viewer: 'manager' | 'collaborateur' }) {
  if (!canSeeOtherSide(viewer, review)) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={<EyeOff aria-hidden />}
          title="Vue côte à côte pas encore disponible"
          description={
            viewer === 'manager'
              ? 'Elle s’affiche dès que le collaborateur a validé sa préparation. Ses réponses en cours ne vous sont pas visibles.'
              : 'Elle s’affiche quand votre préparation et celle de votre manager sont toutes deux validées.'
          }
        />
      </div>
    );
  }
  const get = (key: string, author: 'manager' | 'collaborateur') =>
    answers.find((a) => a.question_key === key && a.author === author)?.value as AnswerValue | undefined;
  const gaps = questions.filter((q) => hasGap(q.type, get(q.key, 'collaborateur'), get(q.key, 'manager'))).length;

  return (
    <div className="flex flex-col gap-3">
      {gaps > 0 && (
        <p className="flex items-center gap-2 text-sm text-warning">
          <AlertTriangle className="size-4" aria-hidden />
          {gaps} écart{gaps > 1 ? 's' : ''} d’appréciation à discuter
        </p>
      )}
      <div className="rounded-lg border border-line bg-surface">
        <div className="hidden grid-cols-2 gap-6 border-b border-line bg-surface-muted/50 px-4 py-2 text-xs font-medium text-fg-subtle md:grid">
          <span>Collaborateur</span>
          <span>Manager</span>
        </div>
        <ul className="divide-y divide-line">
          {questions.map((q) => {
            const collab = get(q.key, 'collaborateur');
            const manager = get(q.key, 'manager');
            const gap = hasGap(q.type, collab, manager);
            return (
              <li key={q.key} className={cn('flex flex-col gap-3 px-4 py-4', gap && 'border-l-2 border-warning pl-3')}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium text-fg-muted">{q.label}</span>
                  {gap && <span className="shrink-0 text-xs font-medium text-warning">Écart</span>}
                </div>
                <div className="grid gap-4 md:grid-cols-2 md:gap-6">
                  <p className="whitespace-pre-line text-base">
                    <span className="mr-2 text-xs text-fg-subtle md:hidden">Collaborateur :</span>
                    {formatAnswer(q.type, collab)}
                  </p>
                  <p className="whitespace-pre-line text-base">
                    <span className="mr-2 text-xs text-fg-subtle md:hidden">Manager :</span>
                    {formatAnswer(q.type, manager)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
