import { ArrowDownRight, ArrowUpRight, CalendarPlus, MessageCircle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { isoAddDays, todayIso } from '@/shared/lib/dates';
import { formatDecimal, fullName, relativeDays } from '@/shared/lib/format';
import { daysFromToday } from '@/shared/lib/dates';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { average, ENERGY, ENERGY_COLOR, lastWorkdays, MOOD, MOOD_COLOR, pulseSignals } from '../lib/pulse';
import { usePulses } from '../queries';

const DAY_LETTER = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function Trend({ now, before }: { now: number | null; before: number | null }) {
  if (now === null || before === null || Math.abs(now - before) < 0.1) return null;
  const up = now > before;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('tabular inline-flex items-center text-xs font-medium', up ? 'text-success' : 'text-danger')}>
      <Icon className="size-3" aria-hidden />
      {formatDecimal(Math.abs(now - before))}
    </span>
  );
}

/**
 * Pouls de l'équipe (manager) : participation du jour, humeur et motivation moyennes,
 * signaux à traiter avec un one-to-one en un clic, carte des 10 derniers jours et derniers mots.
 */
export function TeamPulse({ people }: { people: Person[] }) {
  const pulses = usePulses();
  const today = todayIso();
  if (!pulses.data) return <Skeleton className="h-80 rounded-lg" />;

  const data = pulses.data;
  const days = lastWorkdays(today, 10);
  const week = data.filter((p) => p.day > isoAddDays(today, -7));
  const prevWeek = data.filter((p) => p.day <= isoAddDays(today, -7) && p.day > isoAddDays(today, -14));
  const answeredToday = new Set(data.filter((p) => p.day === today).map((p) => p.collaborator_id));
  const signals = pulseSignals(data, people, today);
  const byKey = new Map(data.map((p) => [`${p.collaborator_id}|${p.day}`, p]));
  const notes = data.filter((p) => p.note && p.day > isoAddDays(today, -7)).slice(0, 5);
  const byId = new Map(people.map((p) => [p.id, p]));
  const mood = average(week, 'mood');
  const energy = average(week, 'energy');

  return (
    <div className="flex flex-col gap-4">
      <div className="stagger grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-gradient-to-br from-hero-from/10 to-surface p-4 shadow-sm">
          <span className="flex size-9 items-center justify-center rounded bg-gradient-to-br from-hero-from to-hero-to text-white shadow-sm">
            <Users className="size-5" aria-hidden />
          </span>
          <p className="tabular text-xl font-semibold">
            {answeredToday.size}
            <span className="text-base font-normal text-fg-subtle"> / {people.length}</span>
          </p>
          <p className="text-sm text-fg-muted">Réponses aujourd’hui</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full origin-left animate-grow rounded-full bg-gradient-to-r from-hero-from to-hero-to" style={{ width: `${people.length ? (answeredToday.size / people.length) * 100 : 0}%` }} />
          </div>
        </div>
        {[
          { key: 'mood' as const, value: mood, label: 'Humeur · 7 jours', steps: MOOD, colors: MOOD_COLOR },
          { key: 'energy' as const, value: energy, label: 'Motivation · 7 jours', steps: ENERGY, colors: ENERGY_COLOR },
        ].map(({ key, value, label, steps, colors }) => {
          const level = value === null ? 3 : Math.min(5, Math.max(1, Math.round(value)));
          const Icon = steps[level].icon;
          return (
            <div key={key} className={cn('flex flex-col gap-2 rounded-lg border border-line bg-gradient-to-br to-surface p-4 shadow-sm', key === 'mood' ? MOOD_COLOR[level].wash : 'from-energy-4/10')}>
              <span className={cn('flex size-9 items-center justify-center rounded shadow-sm', colors[level].solid)}>
                <Icon className="size-5" aria-hidden />
              </span>
              <p className="flex items-baseline gap-2">
                <span className="tabular text-xl font-semibold">{value === null ? '—' : formatDecimal(value)}</span>
                <Trend now={value} before={average(prevWeek, key)} />
              </p>
              <p className="text-sm text-fg-muted">{label}</p>
            </div>
          );
        })}
      </div>

      {signals.length > 0 && (
        <Panel title="À surveiller" description="Détecté à partir du pouls des derniers jours" flush>
          <ul className="stagger divide-y divide-line">
            {signals.map((s) => {
              const person = byId.get(s.personId);
              return (
                <li key={`${s.personId}-${s.kind}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  {person && <Avatar person={person} />}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 text-base font-medium">
                      <span className={cn('size-2 shrink-0 rounded-full', s.severity === 'danger' ? 'bg-danger' : 'bg-warning')} aria-hidden />
                      {s.title}
                    </span>
                    <span className="text-sm text-fg-subtle">{s.detail}</span>
                  </span>
                  <Button asChild size="sm" variant={s.severity === 'danger' ? 'primary' : 'secondary'}>
                    <Link to={`/entretiens?planifier=1&collaborateur=${s.personId}`}>
                      <CalendarPlus aria-hidden />
                      Proposer un 1:1
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel title="Humeur des 10 derniers jours" description="Une case par jour ouvré · touchez un nom pour sa fiche" flush>
        <div className="overflow-hidden px-5 pb-5">
          <div className="grid items-center gap-y-2" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${days.length}, 1.25rem)`, columnGap: '0.25rem' }}>
            <span />
            {days.map((d) => (
              <span key={d} className={cn('text-center text-[10px] font-medium', d === today ? 'text-accent' : 'text-fg-subtle')}>
                {DAY_LETTER[new Date(`${d}T12:00:00`).getDay()]}
              </span>
            ))}
            {people.map((p) => (
              <div key={p.id} className="contents">
                <Link to={`/equipe/${p.id}`} className="flex min-w-0 items-center gap-2 pr-2 hover:underline">
                  <Avatar person={p} size="xs" />
                  <span className="truncate text-sm">{p.first_name}</span>
                </Link>
                {days.map((d) => {
                  const v = byKey.get(`${p.id}|${d}`);
                  return (
                    <span
                      key={d}
                      title={v ? `${d} · humeur ${MOOD[v.mood].label}, motivation ${ENERGY[v.energy].label}` : `${d} · pas de réponse`}
                      className={cn('size-5 rounded-md transition-transform hover:scale-125', v ? MOOD_COLOR[v.mood].dot : 'bg-surface-muted', d === today && !v && 'ring-1 ring-inset ring-accent/40')}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-fg-subtle">
            {[5, 4, 3, 2, 1].map((n) => (
              <span key={n} className="flex items-center gap-1">
                <span className={cn('size-3 rounded', MOOD_COLOR[n].dot)} /> {MOOD[n].label}
              </span>
            ))}
            <span className="flex items-center gap-1"><span className="size-3 rounded bg-surface-muted" /> Pas de réponse</span>
          </div>
        </div>
      </Panel>

      {notes.length > 0 && (
        <Panel title="Derniers mots de l’équipe" flush>
          <ul className="stagger divide-y divide-line">
            {notes.map((n) => {
              const person = byId.get(n.collaborator_id);
              const M = MOOD[n.mood].icon;
              return (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded', MOOD_COLOR[n.mood].solid)}>
                    <M className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base">« {n.note} »</span>
                    <span className="flex items-center gap-1 text-xs text-fg-subtle">
                      <MessageCircle className="size-3" aria-hidden />
                      {person ? fullName(person) : '—'} · {relativeDays(daysFromToday(n.day))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
