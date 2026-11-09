import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ObservationDialog } from '@/features/notebook/components/ObservationDialog';
import { OBS_TONE, useObservations, type ObservationTone } from '@/features/notebook/queries';
import { useDiscProfiles } from '@/features/team/disc-queries';
import { formAdvice } from '@/features/posture/lib/posture';
import type { DiscStyle } from '@/features/team/lib/disc';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input, Textarea } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import type { Review } from '../api';
import { useReviewPrep, useReviewActions, useReviews, useSaveReviewPrep } from '../queries';

const POSTURES = [
  { id: 'rassurant', label: 'Rassurant' },
  { id: 'challengeant', label: 'Challengeant' },
  { id: 'leger', label: 'Léger' },
  { id: 'serieux', label: 'Sérieux' },
] as const;

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sec-reviews/10 text-xs font-semibold text-sec-reviews">{n}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </section>
  );
}

/** « Comment bien préparer un 1 à 1 » (kit Keylia) : cinq étapes, privées au manager. */
export function KeyliaPrep({ review }: { review: Review }) {
  const prep = useReviewPrep(review.id);
  const save = useSaveReviewPrep(review.id);
  const observations = useObservations();
  const reviews = useReviews();
  const actions = useReviewActions();
  const discs = useDiscProfiles();
  const [noting, setNoting] = useState(false);
  const [theme, setTheme] = useState('');
  const [news, setNews] = useState('');

  useEffect(() => {
    setTheme(prep.data?.theme ?? '');
    setNews(prep.data?.company_news ?? '');
  }, [prep.data?.theme, prep.data?.company_news]);

  const previous = (reviews.data ?? [])
    .filter((r) => r.collaborator_id === review.collaborator_id && r.kind === 'one_to_one' && r.status === 'termine' && r.scheduled_at < review.scheduled_at)
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
  const since = previous?.scheduled_at.slice(0, 10) ?? '1970-01-01';
  const facts = (observations.data ?? []).filter((o) => o.collaborator_id === review.collaborator_id && o.observed_on >= since);
  const engagements = (actions.data ?? []).filter((a) => a.review_id === previous?.id);
  const disc = discs.data?.find((d) => d.collaborator_id === review.collaborator_id);

  return (
    <Panel title="Préparer en 5 étapes" description="5 à 10 minutes, privé : le collaborateur ne voit pas cette préparation.">
      <div className="flex flex-col gap-5">
        <Step n={1} title="Ce que j’ai observé depuis le dernier 1 à 1">
          {facts.length === 0 && <p className="text-sm text-fg-muted">Aucune observation notée.</p>}
          <ul className="flex flex-col gap-1">
            {facts.map((o) => (
              <li key={o.id} className="flex gap-2 text-sm">
                <span className={`mt-2 size-2 shrink-0 rounded-full ${OBS_TONE[o.tone as ObservationTone].dot}`} aria-hidden />
                <span>
                  <span className="text-fg-subtle">{formatDate(o.observed_on)} · </span>
                  {o.body}
                </span>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="self-start" onClick={() => setNoting(true)}>
            <Plus aria-hidden />
            Noter une observation
          </Button>
        </Step>
        <Step n={2} title="Un grand thème pour l’aider à progresser">
          <Input
            aria-label="Thème du 1 à 1"
            value={theme}
            maxLength={300}
            placeholder="Ex. : comprendre ce qui a changé depuis deux semaines"
            onChange={(e) => setTheme(e.target.value)}
            onBlur={() => theme !== (prep.data?.theme ?? '') && save.mutate({ theme })}
          />
        </Step>
        <Step n={3} title="Ce que je partage sur l’entreprise">
          <Textarea
            aria-label="Informations à partager"
            rows={2}
            value={news}
            maxLength={1000}
            placeholder="Mettre dans la confidence renforce la confiance."
            onChange={(e) => setNews(e.target.value)}
            onBlur={() => news !== (prep.data?.company_news ?? '') && save.mutate({ company_news: news })}
          />
        </Step>
        <Step n={4} title="Ma posture pour cet échange">
          <Segmented value={prep.data?.posture ?? ''} onValueChange={(v) => save.mutate({ posture: v as (typeof POSTURES)[number]['id'] })} aria-label="Posture" className="w-full">
            {POSTURES.map((p) => (
              <SegmentedItem key={p.id} value={p.id} className="flex-1 justify-center px-2">
                {p.label}
              </SegmentedItem>
            ))}
          </Segmented>
          <p className="text-xs text-fg-subtle">{formAdvice((disc?.primary_style as DiscStyle | undefined) ?? null)}</p>
        </Step>
        <Step n={5} title="Relire le dernier 1 à 1">
          {previous ? (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-fg-subtle">{formatDate(previous.scheduled_at)}</span>
              {previous.priority && (
                <span>
                  <span className="font-medium">Priorité retenue : </span>
                  {previous.priority}
                </span>
              )}
              {previous.summary && <span className="text-fg-muted">{previous.summary}</span>}
              {engagements.map((a) => (
                <span key={a.id} className={a.status === 'fait' ? 'text-success' : 'text-warning'}>
                  {a.status === 'fait' ? '✓' : '•'} {a.title}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-fg-muted">Premier 1 à 1 avec ce collaborateur.</p>
          )}
        </Step>
      </div>
      <ObservationDialog open={noting} onOpenChange={setNoting} defaultPerson={review.collaborator_id} />
    </Panel>
  );
}
