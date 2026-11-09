import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMissions } from '@/features/delegation/queries';
import { LeverChips } from '@/features/dream/components/LeverChips';
import { LEVERS, nextLevers } from '@/features/dream/lib/dream';
import { useDreamStates } from '@/features/dream/queries';
import { ENERGY_COLOR, MOOD_COLOR, pulseSignals, WORKLOAD_COLOR } from '@/features/pulse/lib/pulse';
import { usePulses } from '@/features/pulse/queries';
import { useReviewActions, useReviews } from '@/features/reviews/queries';
import { useTasks } from '@/features/tasks/queries';
import { todayIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';

function Strip({ label, values, color }: { label: string; values: (number | null)[]; color: (v: number) => string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-fg-subtle">{label}</span>
      <div className="flex flex-1 gap-1">
        {values.map((v, i) => (
          <span key={i} className={`h-4 flex-1 rounded-sm ${v ? color(v) : 'bg-surface-muted'}`} title={v ? `${v} / 5` : 'pas de réponse'} />
        ))}
      </div>
    </div>
  );
}

/** « Où en est-il ? » : pouls, signaux faibles, échéances, dernier 1 à 1, leviers DREAM, missions. */
export function PersonOverview({ person }: { person: { id: string; first_name: string } }) {
  const pulses = usePulses();
  const tasks = useTasks();
  const reviews = useReviews();
  const actions = useReviewActions();
  const missions = useMissions();
  const dream = useDreamStates();
  const today = todayIso();

  if (!pulses.data || !tasks.data || !reviews.data || !actions.data) return <Skeleton className="h-96" />;

  const mine = pulses.data.filter((p) => p.collaborator_id === person.id).sort((a, b) => a.day.localeCompare(b.day)).slice(-15);
  const signals = pulseSignals(pulses.data, [person], today);
  const late = tasks.data.filter((t) => t.assignee_id === person.id && t.status !== 'termine' && t.due_date !== null && t.due_date < today);
  const last = reviews.data
    .filter((r) => r.collaborator_id === person.id && r.kind === 'one_to_one' && r.status === 'termine')
    .sort((a, b) => b.scheduled_at.localeCompare(a.scheduled_at))[0];
  const next = reviews.data.filter((r) => r.collaborator_id === person.id && r.status === 'planifie').sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const engagements = actions.data.filter((a) => a.review_id === last?.id);
  const states = dream.data?.get(person.id) ?? [];
  const todo = nextLevers(states);
  const active = (missions.data ?? []).filter((m) => m.collaborator_id === person.id && m.status === 'en_cours');
  const worrying = signals.length > 0 || late.length > 0;

  return (
    <div className="stagger flex flex-col gap-6">
      {worrying && (
        <div className="flex flex-col gap-2 rounded-lg border border-warning/20 bg-warning-subtle p-4">
          <span className="text-base font-medium">Signaux faibles</span>
          <ul className="flex flex-col gap-1 text-sm">
            {signals.map((s) => (
              <li key={s.kind}>
                {s.title} · <span className="text-fg-muted">{s.detail}</span>
              </li>
            ))}
            {late.map((t) => (
              <li key={t.id}>
                Échéance manquée : {t.title} <span className="text-fg-muted">(prévue le {t.due_date && formatDate(t.due_date)})</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="primary">
              <Link to={`/posture?collaborateur=${person.id}`}>
                Décider avec la bonne posture
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to={next ? `/entretiens/${next.id}` : `/entretiens?planifier=1&collaborateur=${person.id}`}>{next ? 'Préparer son 1 à 1' : 'Planifier un 1 à 1'}</Link>
            </Button>
          </div>
        </div>
      )}

      <Panel title="Pouls des 3 dernières semaines" description="Ce qu’il déclare lui-même, jour après jour.">
        {mine.length === 0 ? (
          <p className="text-sm text-fg-muted">Pas encore de pouls.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <Strip label="Humeur" values={mine.map((p) => p.mood)} color={(v) => MOOD_COLOR[v].solid} />
            <Strip label="Motivation" values={mine.map((p) => p.energy)} color={(v) => ENERGY_COLOR[v].solid} />
            <Strip label="Charge" values={mine.map((p) => p.workload)} color={(v) => WORKLOAD_COLOR[v].solid} />
            <span className="flex justify-between text-xs text-fg-subtle">
              <span>{formatDate(mine[0].day)}</span>
              <span>{formatDate(mine[mine.length - 1].day)}</span>
            </span>
            {mine.filter((p) => p.note).slice(-2).map((p) => (
              <p key={p.day} className="text-sm text-fg-muted">
                « {p.note} » <span className="text-xs text-fg-subtle">{formatDate(p.day)}</span>
              </p>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Dernier 1 à 1" description={last ? formatDate(last.scheduled_at) : 'Aucun 1 à 1 enregistré'}>
          {last ? (
            <div className="flex flex-col gap-2 text-sm">
              {last.priority && (
                <p>
                  <span className="font-medium">Priorité : </span>
                  {last.priority}
                </p>
              )}
              {engagements.map((a) => (
                <p key={a.id} className={a.status === 'fait' ? 'text-success' : a.due_date && a.due_date < today ? 'text-danger' : ''}>
                  {a.status === 'fait' ? 'Tenu' : a.due_date && a.due_date < today ? 'Non tenu' : 'En cours'} · {a.title}
                </p>
              ))}
              {next && <p className="text-fg-subtle">Prochain 1 à 1 le {formatDate(next.scheduled_at)}</p>}
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to={`/entretiens?planifier=1&collaborateur=${person.id}`}>Planifier un 1 à 1</Link>
            </Button>
          )}
        </Panel>
        <Panel title="Leviers DREAM" description="Ce que vous avez activé récemment pour son engagement.">
          <div className="flex flex-col gap-3">
            <LeverChips states={states} />
            {todo.length === 0 ? (
              <p className="text-sm text-fg-muted">Tous les leviers sont activés.</p>
            ) : (
              todo.map((s) => (
                <Link key={s.lever} to={LEVERS[s.lever].to(person.id)} className="text-sm text-accent hover:underline">
                  {LEVERS[s.lever].actionLabel} · <span className="text-fg-muted">{s.detail}</span>
                </Link>
              ))
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Missions confiées en cours">
        {active.length === 0 ? (
          <p className="text-sm text-fg-muted">Aucune mission en cours.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((m) => (
              <li key={m.id} className="text-sm">
                <span className="font-medium">{m.title}</span>
                <span className="text-fg-subtle"> · autonomie {m.autonomy}/5{m.due_date ? ` · pour le ${formatDate(m.due_date)}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
