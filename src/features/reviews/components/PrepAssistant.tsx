import { Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { FEEDBACK_KIND, useFeedbacks } from '@/features/feedback/queries';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useObjectives } from '@/features/objectives/queries';
import { usePulses } from '@/features/pulse/queries';
import { MOOD_COLOR, WORKLOAD_COLOR } from '@/features/pulse/lib/pulse';
import { useTasks } from '@/features/tasks/queries';
import { useWeather } from '@/features/weather/queries';
import { daysBetween, lastWeeks, todayIso } from '@/shared/lib/dates';
import { formatDate, formatPercent } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Sparkline } from '@/shared/ui/charts';
import { Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import type { Review } from '../api';
import { suggestTopics } from '../lib/assistant';
import { useReviewActions, useReviews } from '../queries';

/** Aide à la préparation du manager : synthèse pré-remplie et sujets suggérés. */
export function PrepAssistant({ review }: { review: Review }) {
  const objectives = useObjectives();
  const weather = useWeather();
  const pulses = usePulses();
  const tasks = useTasks();
  const feedbacks = useFeedbacks();
  const actions = useReviewActions();
  const reviews = useReviews();
  const id = review.collaborator_id;

  const data = useMemo(() => {
    if (!objectives.data || !weather.data || !pulses.data || !tasks.data || !feedbacks.data || !actions.data || !reviews.data) return null;
    const previous = reviews.data.find((r) => r.collaborator_id === id && r.status === 'termine' && r.scheduled_at < review.scheduled_at);
    const since = previous?.scheduled_at ?? '1970-01-01';
    const weeks = lastWeeks(8);
    const myWeather = weather.data.filter((w) => w.collaborator_id === id);
    const today = todayIso();
    const myPulses = pulses.data.filter((p) => p.collaborator_id === id).sort((a, b) => a.day.localeCompare(b.day)).slice(-10);
    const myFeedbacks = feedbacks.data.filter((f) => f.collaborator_id === id);
    const lastReco = myFeedbacks
      .filter((f) => f.is_shared && (f.kind === 'reconnaissance' || f.kind === 'point_fort'))
      .map((f) => f.created_at.slice(0, 10))
      .sort()
      .pop();
    const prevIds = new Set(reviews.data.filter((r) => r.collaborator_id === id && r.scheduled_at < review.scheduled_at).map((r) => r.id));
    const input = {
      objectives: objectives.data.filter((o) => o.owner_id === id),
      weather: myWeather,
      recentWorkload: myPulses.map((p) => p.workload).filter((w): w is number => w !== null),
      feedbacks: myFeedbacks.filter((f) => f.created_at >= since),
      openActions: actions.data.filter((a) => prevIds.has(a.review_id) && a.status !== 'fait'),
      lateTasks: tasks.data.filter((t) => t.assignee_id === id && t.status !== 'termine' && t.due_date !== null && t.due_date < today),
      daysSinceRecognition: lastReco ? daysBetween(lastReco, today) : null,
      today,
    };
    return { input, previous, myPulses, moods: weeks.map((w) => myWeather.find((x) => x.week_start === w)?.mood ?? null), suggestions: suggestTopics(input) };
  }, [objectives.data, weather.data, pulses.data, tasks.data, feedbacks.data, actions.data, reviews.data, id, review.scheduled_at]);

  if (!data) {
    return (
      <Panel title="Aide à la préparation">
        <Skeleton className="h-48" />
      </Panel>
    );
  }
  const { input, moods, suggestions, previous, myPulses } = data;

  return (
    <>
      <Panel title="Sujets suggérés" description="Déduits des alertes et des derniers échanges" flush>
        <ul className="divide-y divide-line">
          {suggestions.map((s) => (
            <li key={s.id} className="flex gap-3 px-4 py-3">
              <Lightbulb className="mt-px size-4 shrink-0 text-fg-subtle" aria-hidden />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{s.title}</span>
                <span className="text-xs text-fg-subtle">{s.reason}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Synthèse automatique" description={previous ? `Depuis l’entretien du ${formatDate(previous.scheduled_at)}` : 'Premier entretien'}>
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Objectifs en cours</h3>
            {input.objectives.length === 0 && <p className="text-sm text-fg-muted">Aucun objectif individuel.</p>}
            {input.objectives.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{o.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular">{formatPercent(o.progress)}</span>
                  <Badge tone={OBJECTIVE_STATUS[o.status].tone}>{OBJECTIVE_STATUS[o.status].label}</Badge>
                </span>
              </div>
            ))}
          </section>
          <section className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h3 className="text-xs font-medium text-fg-subtle">Humeur (pouls), 8 dernières semaines</h3>
              <span className="tabular text-sm">{moods.filter((m) => m !== null).slice(-1)[0] ?? '—'} / 5 cette semaine</span>
            </div>
            <Sparkline values={moods} />
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Pouls des 10 derniers jours (humeur, puis charge)</h3>
            {myPulses.length === 0 ? (
              <p className="text-sm text-fg-muted">Pas de pouls récent.</p>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  {myPulses.map((p) => (
                    <span key={p.day} title={`${formatDate(p.day)} · humeur ${p.mood} / 5`} className={`h-3 flex-1 rounded-sm ${MOOD_COLOR[p.mood].solid}`} />
                  ))}
                </div>
                <div className="flex gap-1">
                  {myPulses.map((p) => (
                    <span key={p.day} title={`${formatDate(p.day)} · charge ${p.workload ?? '?'} / 5`} className={`h-3 flex-1 rounded-sm ${p.workload ? WORKLOAD_COLOR[p.workload].solid : 'bg-surface-muted'}`} />
                  ))}
                </div>
              </div>
            )}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Échéances manquées ({input.lateTasks.length})</h3>
            {input.lateTasks.map((t) => (
              <p key={t.title} className="text-sm">
                {t.title}
                {t.due_date && <span className="text-danger"> · prévue le {formatDate(t.due_date)}</span>}
              </p>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Feedbacks reçus ({input.feedbacks.length})</h3>
            {input.feedbacks.slice(0, 3).map((f) => (
              <p key={f.created_at} className="text-sm">
                <span className="font-medium">{FEEDBACK_KIND[f.kind]} · </span>
                <span className="text-fg-muted">{f.body}</span>
              </p>
            ))}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Actions du dernier entretien non terminées ({input.openActions.length})</h3>
            {input.openActions.map((a) => (
              <p key={a.id} className="text-sm">
                {a.title}
                {a.due_date && <span className="text-fg-subtle"> · {formatDate(a.due_date)}</span>}
              </p>
            ))}
          </section>
        </div>
      </Panel>
    </>
  );
}
