import { useEffect, useId, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { Textarea } from '@/shared/ui/input';
import type { Question } from '../api';
import type { AnswerValue } from '../lib/review-rules';

interface Props {
  question: Question;
  value: AnswerValue | undefined;
  disabled: boolean;
  onSave: (value: AnswerValue) => void;
}

const choiceClass = (selected: boolean) =>
  cn(
    'h-8 rounded border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed',
    selected ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-surface text-fg hover:bg-surface-muted',
  );

/** Saisie d'une réponse selon le type de question : texte libre, échelle 1–5, choix, oui/non. */
export function QuestionInput({ question, value, disabled, onSave }: Props) {
  const id = useId();
  const [text, setText] = useState(typeof value === 'string' ? value : '');
  useEffect(() => {
    if (typeof value === 'string') setText(value);
  }, [value]);

  return (
    <>
      <label htmlFor={id} id={`${id}-label`} className="text-base font-medium">
        {question.label}
      </label>
      {question.help && <p className="-mt-1 text-xs text-fg-subtle">{question.help}</p>}

      {question.type === 'texte' && (
        <Textarea
          id={id}
          rows={3}
          maxLength={4000}
          disabled={disabled}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== (value ?? '') && onSave(text.trim())}
          placeholder={disabled ? 'Pas de réponse' : 'Votre réponse…'}
        />
      )}

      {question.type === 'echelle' && (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              disabled={disabled}
              onClick={() => onSave(n)}
              className={cn(choiceClass(value === n), 'tabular w-10 px-0')}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {question.type === 'choix' && (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <button key={option} type="button" role="radio" aria-checked={value === option} disabled={disabled} onClick={() => onSave(option)} className={choiceClass(value === option)}>
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'oui_non' && (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex gap-2">
          {[
            { v: true, label: 'Oui' },
            { v: false, label: 'Non' },
          ].map((o) => (
            <button key={o.label} type="button" role="radio" aria-checked={value === o.v} disabled={disabled} onClick={() => onSave(o.v)} className={choiceClass(value === o.v)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
