import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { isoWeekLabel, weekStartIso } from '@/shared/lib/dates';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Textarea } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import { MOOD_LABEL, WORKLOAD_LABEL } from '../lib/weather';
import { useSaveWeather, useWeather } from '../queries';

function Scale({ label, value, onChange, labels }: { label: string; value: number | null; onChange: (n: number) => void; labels: Record<number, string> }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-base font-medium">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              'flex flex-col items-center gap-1 rounded border px-2 py-2 transition-colors',
              value === n ? 'border-accent bg-accent-subtle text-fg' : 'border-line-strong bg-surface text-fg-muted hover:bg-surface-muted',
            )}
          >
            <span className="tabular text-md font-semibold">{n}</span>
            <span className="text-center text-xs">{labels[n]}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Saisie hebdomadaire du collaborateur et historique de ses réponses. */
export function WeatherEntry() {
  const { profile } = useCurrentUser();
  const weather = useWeather();
  const save = useSaveWeather();
  const week = weekStartIso(new Date());
  const mine = (weather.data ?? []).filter((w) => w.collaborator_id === profile.id).sort((a, b) => b.week_start.localeCompare(a.week_start));
  const current = mine.find((w) => w.week_start === week);
  const [mood, setMood] = useState<number | null>(null);
  const [load, setLoad] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (current) {
      setMood(current.mood);
      setLoad(current.workload);
      setComment(current.comment);
    }
  }, [current]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Panel title={`Semaine ${isoWeekLabel(week).slice(1)}`} description={`Du lundi ${formatDate(week)}${current ? ' · déjà saisie, modifiable' : ''}`}>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (mood && load) save.mutate({ collaborator_id: profile.id, week_start: week, mood, workload: load, comment: comment.trim() });
          }}
        >
          <Scale label="Comment s’est passée votre semaine ?" value={mood} onChange={setMood} labels={MOOD_LABEL} />
          <Scale label="Comment ressentez-vous votre charge ?" value={load} onChange={setLoad} labels={WORKLOAD_LABEL} />
          <Field label="Commentaire" optional hint="500 caractères maximum. Visible par votre manager.">
            <Textarea rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" className="self-start" disabled={!mood || !load || save.isPending}>
            {current ? 'Mettre à jour' : 'Enregistrer ma météo'}
          </Button>
        </form>
      </Panel>
      <Panel title="Mes dernières semaines" flush>
        <Table>
          <THead>
            <tr>
              <Th>Semaine</Th>
              <Th align="right">Humeur</Th>
              <Th align="right">Charge</Th>
              <Th>Commentaire</Th>
            </tr>
          </THead>
          <TBody>
            {mine.slice(0, 10).map((w) => (
              <Tr key={w.id}>
                <Td className="tabular whitespace-nowrap">{isoWeekLabel(w.week_start)}</Td>
                <Td numeric>{w.mood}</Td>
                <Td numeric>{w.workload}</Td>
                <Td className="max-w-60 truncate text-fg-muted">{w.comment || '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Panel>
    </div>
  );
}
