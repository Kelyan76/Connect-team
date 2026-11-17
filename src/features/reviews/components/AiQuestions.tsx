import { MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';
import { askAiFor } from '@/features/ai/client';
import { AiButton } from '@/features/ai/components/AiButton';
import { parseQuestions, prepPrompt } from '@/features/ai/lib/ai';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { DISC, type DiscStyle } from '@/features/team/lib/disc';

/** Trois questions d'ouverture proposées par l'IA, adaptées aux signaux et au profil DISC du collaborateur. */
export function AiQuestions({
  collaboratorId,
  firstName,
  signals,
}: {
  collaboratorId: string;
  firstName: string;
  signals: string[];
}) {
  const discs = useDiscProfiles();
  const [questions, setQuestions] = useState<string[]>([]);
  const disc = discs.data?.find((d) => d.collaborator_id === collaboratorId);
  const style = disc ? DISC[disc.primary_style as DiscStyle] : undefined;

  const run = async () => {
    setQuestions(
      await askAiFor(
        prepPrompt({
          firstName,
          disc:
            style && disc ? `${disc.primary_style}, ${style.name} : ${style.oneToOne}` : undefined,
          signals,
        }),
        parseQuestions,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
      <AiButton
        label={questions.length ? 'Proposer d’autres questions' : 'Questions d’ouverture avec l’IA'}
        className="self-start"
        run={run}
      />
      {questions.length > 0 && (
        <ul className="stagger flex flex-col gap-2">
          {questions.map((q) => (
            <li key={q} className="flex gap-2 text-sm">
              <MessageCircleQuestion
                className="mt-px size-4 shrink-0 text-sec-reviews"
                aria-hidden
              />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
