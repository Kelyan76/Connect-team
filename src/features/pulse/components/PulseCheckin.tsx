import { Flame, Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { ENERGY, lastWorkdays, MOOD, streak, toneOf, type ScaleStep } from '../lib/pulse';
import { usePulses, useSavePulse } from '../queries';

const TONE_ON: Record<string, string> = {
  danger: 'border-danger bg-danger-subtle text-danger',
  warning: 'border-warning bg-warning-subtle text-warning',
  success: 'border-success bg-success-subtle text-success',
};
const DOT: Record<string, string> = { danger: 'bg-danger', warning: 'bg-warning', success: 'bg-success' };

function Scale({ label, steps, value, onChange }: { label: string; steps: Record<number, ScaleStep>; value: number | null; onChange: (n: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-sm font-medium text-fg-muted">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const Icon = steps[n].icon;
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(n)}
              className={cn(
                'flex flex-col items-center gap-1 rounded border px-1 py-2 transition-all duration-200 active:scale-95',
                on ? `${TONE_ON[toneOf(n)]} scale-105 shadow-sm` : 'border-line bg-surface text-fg-subtle hover:border-line-strong hover:text-fg',
              )}
            >
              <Icon className={cn('size-6 transition-transform', on && 'scale-110')} aria-hidden />
              <span className="text-[11px] leading-tight">{steps[n].label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** 10 derniers jours ouvrés en pastilles colorées (humeur), aujourd'hui à droite. */
function History({ byDay }: { byDay: Map<string, number> }) {
  const days = lastWorkdays(todayIso(), 10);
  return (
    <div className="flex items-center gap-1" aria-label="Humeur des 10 derniers jours ouvrés">
      {days.map((d) => {
        const v = byDay.get(d);
        return <span key={d} title={d} className={cn('size-3 rounded-full', v ? DOT[toneOf(v)] : 'bg-line-strong')} />;
      })}
    </div>
  );
}

/**
 * Pouls du jour du collaborateur : humeur et motivation en deux touchers, un mot facultatif.
 * Une fois saisi, la carte se replie et affiche la série de jours consécutifs.
 */
export function PulseCheckin() {
  const { profile } = useCurrentUser();
  const pulses = usePulses();
  const save = useSavePulse();
  const today = todayIso();
  const mine = (pulses.data ?? []).filter((p) => p.collaborator_id === profile.id);
  const current = mine.find((p) => p.day === today);
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const days = mine.map((p) => p.day);
  const series = streak(days, today);
  const byDay = new Map(mine.map((p) => [p.day, p.mood]));

  if (!pulses.data) return <Skeleton className="mb-6 h-40 rounded-lg" />;

  const open = !current || editing;
  const start = () => {
    setMood(current?.mood ?? null);
    setEnergy(current?.energy ?? null);
    setNote(current?.note ?? '');
    setEditing(true);
  };

  if (!open && current) {
    const M = MOOD[current.mood].icon;
    const E = ENERGY[current.energy].icon;
    return (
      <section className="mb-6 flex animate-page-in flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <span className={cn('flex size-10 items-center justify-center rounded', TONE_ON[toneOf(current.mood)])}>
            <M className="size-5" aria-hidden />
          </span>
          <span className={cn('flex size-10 items-center justify-center rounded', TONE_ON[toneOf(current.energy)])}>
            <E className="size-5" aria-hidden />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base font-medium">Merci, votre pouls du jour est enregistré.</span>
          <History byDay={byDay} />
        </div>
        <div className="flex items-center gap-2">
          {series > 1 && (
            <span className="flex items-center gap-1 rounded-full bg-warning-subtle px-3 py-1 text-sm font-semibold text-warning">
              <Flame className="size-4" aria-hidden />
              {series} jours
            </span>
          )}
          <Button variant="ghost" size="icon-sm" aria-label="Modifier mon pouls du jour" onClick={start}>
            <Pencil aria-hidden />
          </Button>
        </div>
      </section>
    );
  }

  const submit = () => {
    if (!mood || !energy) return;
    save.mutate(
      { collaboratorId: profile.id, mood, energy, note: note.trim() },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <section className="relative mb-6 animate-page-in overflow-hidden rounded-lg border border-accent/30 bg-surface p-5 shadow-sm">
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-accent-subtle" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-md font-semibold">Comment vous sentez-vous aujourd’hui ?</h2>
            <p className="text-sm text-fg-subtle">10 secondes, visible par votre manager uniquement.</p>
          </div>
          {series > 0 && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning-subtle px-3 py-1 text-sm font-semibold text-warning">
              <Flame className="size-4" aria-hidden />
              {series}
            </span>
          )}
        </div>
        <Scale label="Mon humeur" steps={MOOD} value={mood} onChange={setMood} />
        <Scale label="Ma motivation" steps={ENERGY} value={energy} onChange={setEnergy} />
        {mood && energy && (
          <input
            className="h-10 w-full animate-page-in rounded border border-line-strong bg-surface px-3 text-base placeholder:text-fg-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
            placeholder="Un mot pour votre manager ? (facultatif)"
            maxLength={280}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Un mot pour votre manager"
          />
        )}
        <div className="flex gap-2">
          <Button variant="primary" size="lg" className="flex-1 sm:flex-none" disabled={!mood || !energy || save.isPending} onClick={submit}>
            {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
            {current ? 'Mettre à jour' : 'Envoyer mon pouls'}
          </Button>
          {editing && (
            <Button size="lg" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
