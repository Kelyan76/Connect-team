import { Flame, HeartPulse, Loader2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { cn } from '@/shared/lib/cn';
import { todayIso } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { ENERGY, ENERGY_COLOR, lastWorkdays, MOOD, MOOD_COLOR, streak, type ScaleStep } from '../lib/pulse';
import { usePulses, useSavePulse } from '../queries';

type Colors = typeof MOOD_COLOR;

/** Échelle de 5 boutons-icônes : chaque niveau a sa couleur, le choix se remplit et grossit. */
function Scale({ label, steps, colors, value, onChange }: { label: string; steps: Record<number, ScaleStep>; colors: Colors | typeof ENERGY_COLOR; value: number | null; onChange: (n: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-sm font-medium text-fg-muted">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const Icon = steps[n].icon;
          const on = value === n;
          const dim = value !== null && !on;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(n)}
              className={cn(
                'flex flex-col items-center gap-1 rounded border px-1 py-2 transition-all duration-200 active:scale-95',
                on ? cn(colors[n].solid, 'scale-105 shadow-md') : colors[n].soft,
                dim && 'opacity-50 hover:opacity-100',
              )}
            >
              <Icon className={cn('size-6 transition-transform duration-200', on && 'scale-110')} aria-hidden />
              <span className={cn('text-[11px] font-medium leading-tight', !on && 'text-fg-muted')}>{steps[n].label}</span>
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
        return <span key={d} title={d} className={cn('size-3 rounded-full', v ? MOOD_COLOR[v].dot : 'bg-line-strong')} />;
      })}
    </div>
  );
}

function StreakPill({ days, compact }: { days: number; compact?: boolean }) {
  return (
    <span className="flex shrink-0 animate-pop-in items-center gap-1 rounded-full bg-gradient-to-r from-mood-3 to-mood-2 px-3 py-1 text-sm font-semibold text-white shadow-sm">
      <Flame className="size-4" aria-hidden />
      {days}
      {!compact && ` jour${days > 1 ? 's' : ''}`}
    </span>
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
  const series = streak(
    mine.map((p) => p.day),
    today,
  );
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
      <section
        className={cn(
          'mb-6 flex animate-page-in flex-wrap items-center gap-4 rounded-lg border border-line bg-gradient-to-r to-surface p-4 shadow-sm sm:p-5',
          MOOD_COLOR[current.mood].wash,
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('flex size-11 items-center justify-center rounded shadow-sm', MOOD_COLOR[current.mood].solid)} title={MOOD[current.mood].label}>
            <M className="size-6" aria-hidden />
          </span>
          <span className={cn('flex size-11 items-center justify-center rounded shadow-sm', ENERGY_COLOR[current.energy].solid)} title={ENERGY[current.energy].label}>
            <E className="size-6" aria-hidden />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-base font-medium">
            {MOOD[current.mood].label} · motivation {ENERGY[current.energy].label.toLowerCase()}
          </span>
          <History byDay={byDay} />
        </div>
        <div className="flex items-center gap-2">
          {series > 1 && <StreakPill days={series} />}
          <Button variant="ghost" size="icon-sm" aria-label="Modifier mon pouls du jour" onClick={start}>
            <Pencil aria-hidden />
          </Button>
        </div>
      </section>
    );
  }

  const submit = () => {
    if (!mood || !energy) return;
    save.mutate({ collaboratorId: profile.id, mood, energy, note: note.trim() }, { onSuccess: () => setEditing(false) });
  };

  return (
    <section className="relative mb-6 animate-page-in overflow-hidden rounded-lg border border-hero-from/20 bg-gradient-to-br from-hero-from/10 via-surface to-hero-to/10 p-5 shadow-sm">
      <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-40 animate-float-slow rounded-full bg-hero-to/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-32 animate-float rounded-full bg-mood-4/10" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-gradient-to-br from-hero-from to-hero-to text-white shadow-sm">
              <HeartPulse className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-md font-semibold">Comment vous sentez-vous aujourd’hui ?</h2>
              <p className="text-sm text-fg-subtle">10 secondes, visible par votre manager uniquement.</p>
            </div>
          </div>
          {series > 0 && <StreakPill days={series} compact />}
        </div>
        <Scale label="Mon humeur" steps={MOOD} colors={MOOD_COLOR} value={mood} onChange={setMood} />
        <Scale label="Ma motivation" steps={ENERGY} colors={ENERGY_COLOR} value={energy} onChange={setEnergy} />
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
          <Button
            size="lg"
            className="flex-1 border-transparent bg-gradient-to-r from-hero-from to-hero-to text-white shadow-md hover:opacity-95 sm:flex-none"
            disabled={!mood || !energy || save.isPending}
            onClick={submit}
          >
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
