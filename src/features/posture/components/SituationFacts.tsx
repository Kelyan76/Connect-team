import { OBS_TONE, type Observation, type ObservationTone } from '@/features/notebook/queries';
import type { Signal } from '@/features/pulse/lib/pulse';
import { formatDate } from '@/shared/lib/format';

interface Props {
  signals: Signal[];
  lateTasks: { id: string; title: string; due_date: string | null }[];
  observations: Observation[];
  lastOneToOne: string | null;
}

/** Les faits disponibles avant de décider : pouls, échéances, carnet, dernier échange. */
export function SituationFacts({ signals, lateTasks, observations, lastOneToOne }: Props) {
  const empty = signals.length === 0 && lateTasks.length === 0 && observations.length === 0;
  return (
    <div className="flex flex-col gap-3 rounded border border-line bg-surface-muted/40 p-3 text-sm">
      {empty && <p className="text-fg-muted">Aucun signal dans l’application : partez de ce que vous avez constaté.</p>}
      {signals.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-subtle">Pouls</span>
          {signals.map((s) => (
            <span key={s.kind} className={s.severity === 'danger' ? 'text-danger' : 'text-warning'}>
              {s.title} · <span className="text-fg-muted">{s.detail}</span>
            </span>
          ))}
        </div>
      )}
      {lateTasks.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-subtle">Échéances manquées</span>
          {lateTasks.map((t) => (
            <span key={t.id}>
              {t.title}
              {t.due_date && <span className="text-danger"> · prévue le {formatDate(t.due_date)}</span>}
            </span>
          ))}
        </div>
      )}
      {observations.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg-subtle">Votre carnet</span>
          {observations.map((o) => (
            <span key={o.id} className="flex gap-2">
              <span className={`mt-2 size-2 shrink-0 rounded-full ${OBS_TONE[o.tone as ObservationTone].dot}`} aria-hidden />
              <span>
                <span className="text-fg-subtle">{formatDate(o.observed_on)} · </span>
                {o.body}
              </span>
            </span>
          ))}
        </div>
      )}
      <span className="text-xs text-fg-subtle">{lastOneToOne ? `Dernier 1 à 1 le ${formatDate(lastOneToOne)}` : 'Aucun 1 à 1 enregistré'}</span>
    </div>
  );
}
