import { MessageCircleHeart } from 'lucide-react';
import { Panel } from '@/shared/ui/layout';
import type { Answer, Review } from '../api';
import { QUICK_KEYS, valueToTopics } from '../lib/quick-prep';

/** Côté manager : ce que le collaborateur veut aborder, une fois sa préparation envoyée. */
export function CollaboratorTopics({ review, answers, firstName }: { review: Review; answers: Answer[]; firstName: string }) {
  const theirs = new Map(answers.filter((a) => a.author === 'collaborateur').map((a) => [a.question_key, a.value]));
  const topics = valueToTopics(theirs.get(QUICK_KEYS.topics));
  const text = (k: string) => (typeof theirs.get(k) === 'string' ? (theirs.get(k) as string) : '');

  return (
    <Panel title={`Ce que ${firstName} veut aborder`} description="Commencez par ses sujets : les 10 premières minutes sont les siennes.">
      {!review.collaborator_prepared_at ? (
        <p className="text-sm text-fg-muted">{firstName} n’a pas encore envoyé sa préparation.</p>
      ) : topics.length === 0 && !text(QUICK_KEYS.good) && !text(QUICK_KEYS.stuck) ? (
        <p className="text-sm text-fg-muted">Préparation envoyée, sans sujet particulier : ouvrez avec « De quoi veux-tu qu’on parle ? ».</p>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-sec-reviews/10 px-3 py-1 text-sm font-medium text-sec-reviews">
                  <MessageCircleHeart className="size-4" aria-hidden />
                  {t}
                </span>
              ))}
            </div>
          )}
          {text(QUICK_KEYS.good) && (
            <p className="text-sm">
              <span className="font-medium text-success">Ce qui va : </span>
              {text(QUICK_KEYS.good)}
            </p>
          )}
          {text(QUICK_KEYS.stuck) && (
            <p className="text-sm">
              <span className="font-medium text-warning">Ce qui coince : </span>
              {text(QUICK_KEYS.stuck)}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
