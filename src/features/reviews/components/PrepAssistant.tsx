import { Lightbulb } from 'lucide-react';
import { useMemo } from 'react';
import { FEEDBACK_KIND, useFeedbacks } from '@/features/feedback/queries';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useObjectives } from '@/features/objectives/queries';
import { useSettings } from '@/features/settings/queries';
import { useWeather } from '@/features/weather/queries';
import { weeklyLoad } from '@/features/workload/lib/load';
import { useAllocations } from '@/features/workload/queries';
import { isoWeekLabel, lastWeeks, nextWeeks, todayIso } from '@/shared/lib/dates';
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
  const allocations = useAllocations();
  const feedbacks = useFeedbacks();
  const actions = useReviewActions();
  const reviews = useReviews();
  const settings = useSettings();
  const id = review.collaborator_id;

  const data = useMemo(() => {
    if (!objectives.data || !weather.data || !allocations.data || !feedbacks.data || !actions.data || !reviews.data) return null;
    const previous = reviews.data.find((r) => r.collaborator_id === id && r.status === 'termine' && r.scheduled_at < review.scheduled_at);
    const since = previous?.scheduled_at ?? '1970-01-01';
    const weeks = lastWeeks(8);
    const myWeather = weather.data.filter((w) => w.collaborator_id === id);
    const loads = weeklyLoad(allocations.data).get(id);
    const prevIds = new Set(reviews.data.filter((r) => r.collaborator_id === id && r.scheduled_at < review.scheduled_at).map((r) => r.id));
    const input = {
      objectives: objectives.data.filter((o) => o.owner_id === id),
      weather: myWeather,
      // 4 semaines passées, la semaine en cours et la suivante (surcharge prévue).
      loads: nextWeeks(6, new Date(), -4).map((w) => ({ week: w, percent: loads?.get(w) ?? 0 })),
      overloadPct: settings.data?.overload_pct ?? 100,
      feedbacks: feedbacks.data.filter((f) => f.collaborator_id === id && f.created_at >= since),
      openActions: actions.data.filter((a) => prevIds.has(a.review_id) && a.status !== 'fait'),
      today: todayIso(),
    };
    return { input, previous, moods: weeks.map((w) => myWeather.find((x) => x.week_start === w)?.mood ?? null), suggestions: suggestTopics(input) };
  }, [objectives.data, weather.data, allocations.data, feedbacks.data, actions.data, reviews.data, settings.data, id, review.scheduled_at]);

  if (!data) {
    return (
      <Panel title="Aide à la préparation">
        <Skeleton className="h-48" />
      </Panel>
    );
  }
  const { input, moods, suggestions, previous } = data;

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
              <h3 className="text-xs font-medium text-fg-subtle">Météo, 8 dernières semaines</h3>
              <span className="tabular text-sm">{moods.filter((m) => m !== null).slice(-1)[0] ?? '—'} / 5 cette semaine</span>
            </div>
            <Sparkline values={moods} />
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-fg-subtle">Charge récente et à venir</h3>
            <div className="grid grid-cols-6 gap-1">
              {input.loads.map((l) => (
                <div key={l.week} className="flex flex-col items-center gap-1">
                  <span className={`tabular text-xs font-medium ${l.percent > input.overloadPct ? 'text-danger' : 'text-fg'}`}>{l.percent}</span>
                  <span className="text-xs text-fg-subtle">{isoWeekLabel(l.week)}</span>
                </div>
              ))}
            </div>
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
