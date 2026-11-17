import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { isoAddDays, toIsoDate, todayIso } from '@/shared/lib/dates';
import { formatDate, formatMonth, fullName, toDate } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
import { crowdedDays, isWorkingDay } from '../lib/overlap';
import { ABSENCE_KIND, type Absence } from '../queries';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface Props {
  absences: Absence[];
  byId: Map<string, Person>;
  maxAbsent?: number;
  /** Sélection d'une période (collaborateur) : premier puis dernier jour. */
  onPick?: (start: string, end: string) => void;
}

/** Calendrier du mois, semaine par semaine : congés validés (plein) et en attente (pointillé). */
export function MonthCalendar({ absences, byId, maxAbsent, onPick }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [start, setStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const today = todayIso();
  const from = toIsoDate(startOfWeek(month, { weekStartsOn: 1 }));
  const to = toIsoDate(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }));
  const days: string[] = [];
  for (let d = from; d <= to; d = isoAddDays(d, 1)) days.push(d);
  const inMonth = (d: string) => toDate(d).getMonth() === month.getMonth();
  const crowded = new Set(maxAbsent ? crowdedDays(absences, from, to, maxAbsent) : []);
  const on = (d: string) =>
    absences.filter((a) => a.status !== 'refusee' && a.start_date <= d && a.end_date >= d);

  const rangeEnd = start ? (hover && hover >= start ? hover : start) : null;
  const inRange = (d: string) => !!start && !!rangeEnd && d >= start && d <= rangeEnd;
  const pick = (d: string) => {
    if (!onPick || d < today) return;
    if (!start || d < start) {
      setStart(d);
      return;
    }
    onPick(start, d);
    setStart(null);
    setHover(null);
  };

  return (
    <Panel
      title={formatMonth(month)}
      description={
        onPick
          ? start
            ? `Début : ${formatDate(start)}. Touchez maintenant le dernier jour.`
            : 'Touchez le premier jour de votre congé, puis le dernier.'
          : 'Congés de l’équipe : plein = validé, pointillé = en attente.'
      }
      actions={
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Mois précédent"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hidden sm:inline-flex"
            onClick={() => setMonth(startOfMonth(new Date()))}
          >
            Aujourd’hui
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Mois suivant"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-fg-subtle">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div key={from} className="grid animate-page-in grid-cols-7 gap-1">
        {days.map((d) => {
          const list = on(d);
          const working = isWorkingDay(d);
          const past = d < today;
          const clickable = !!onPick && !past;
          return (
            <button
              key={d}
              type="button"
              disabled={!clickable}
              onClick={() => pick(d)}
              onMouseEnter={() => setHover(d)}
              aria-label={`${formatDate(d)}${list.length ? ` : ${list.map((a) => byId.get(a.collaborator_id)?.first_name ?? '').join(', ')} absent(s)` : ''}`}
              className={cn(
                'relative flex min-h-16 flex-col items-stretch gap-1 rounded border p-1 text-left transition-colors sm:min-h-20 sm:p-2',
                inMonth(d)
                  ? 'border-line bg-surface'
                  : 'border-transparent bg-transparent opacity-50',
                !working && 'bg-canvas',
                crowded.has(d) && working && 'border-danger/40 bg-danger-subtle/40',
                clickable && 'hover:border-accent/50',
                inRange(d) && 'border-accent bg-accent-subtle',
                !clickable && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'tabular flex size-6 items-center justify-center rounded-full text-xs',
                  d === today
                    ? 'bg-accent font-semibold text-white'
                    : past
                      ? 'text-fg-subtle'
                      : 'text-fg',
                )}
              >
                {toDate(d).getDate()}
              </span>
              {working && list.length > 0 && (
                <span className="flex flex-wrap gap-0.5">
                  {list.slice(0, 3).map((a) => {
                    const p = byId.get(a.collaborator_id);
                    const title = `${p ? fullName(p) : ''} · ${ABSENCE_KIND[a.kind]}${a.status === 'en_attente' ? ' (en attente)' : ''}`;
                    return p ? (
                      <span
                        key={a.id}
                        title={title}
                        className={cn(
                          'rounded-full',
                          a.status === 'en_attente' &&
                            'opacity-60 outline-dashed outline-1 outline-accent',
                        )}
                      >
                        <Avatar person={p} size="xs" />
                      </span>
                    ) : (
                      <span
                        key={a.id}
                        title={title}
                        className={cn(
                          'h-2 w-full rounded-full',
                          a.status === 'validee'
                            ? 'bg-accent'
                            : 'border border-dashed border-accent',
                        )}
                      />
                    );
                  })}
                  {list.length > 3 && (
                    <span className="text-[10px] text-fg-subtle">+{list.length - 3}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
