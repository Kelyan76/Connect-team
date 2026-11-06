import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { isoAddDays, toIsoDate, todayIso } from '@/shared/lib/dates';
import { formatDate, formatMonth, fullName, toDate } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Panel } from '@/shared/ui/layout';
import { Tooltip } from '@/shared/ui/menu';
import { absentByDay, crowdedDays, isWorkingDay } from '../lib/overlap';
import { ABSENCE_KIND, type Absence } from '../queries';

/** Calendrier mensuel de l'équipe, avec détection des jours de sur-absence. */
export function TeamCalendar({ absences, people, maxAbsent }: { absences: Absence[]; people: Person[]; maxAbsent: number }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const from = toIsoDate(month);
  const to = toIsoDate(endOfMonth(month));
  const days: string[] = [];
  for (let d = from; d <= to; d = isoAddDays(d, 1)) days.push(d);
  const crowded = new Set(crowdedDays(absences, from, to, maxAbsent));
  const counts = absentByDay(absences, from, to);
  const today = todayIso();

  const absenceOn = (personId: string, day: string) =>
    absences.find((a) => a.collaborator_id === personId && a.status !== 'refusee' && a.start_date <= day && a.end_date >= day);

  return (
    <Panel
      title={formatMonth(month)}
      description={crowded.size ? `${crowded.size} jour${crowded.size > 1 ? 's' : ''} avec plus de ${maxAbsent} absents` : `Jamais plus de ${maxAbsent} absents ce mois-ci`}
      actions={
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Mois précédent" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft aria-hidden />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
            Ce mois
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Mois suivant" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight aria-hidden />
          </Button>
        </div>
      }
      flush
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="sticky left-0 z-10 min-w-52 bg-surface px-4 text-left text-xs font-medium text-fg-subtle">
                Collaborateur
              </th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    'tabular h-10 min-w-7 px-0 text-center text-xs font-medium',
                    !isWorkingDay(d) ? 'bg-canvas text-fg-subtle' : crowded.has(d) ? 'text-danger' : 'text-fg-subtle',
                    d === today && 'text-accent',
                  )}
                >
                  <span className="block">{['D', 'L', 'M', 'M', 'J', 'V', 'S'][toDate(d).getDay()]}</span>
                  {toDate(d).getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {people.map((p) => (
              <tr key={p.id}>
                <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-1 text-left font-normal">
                  <PersonLabel person={p} size="xs" />
                </th>
                {days.map((d) => {
                  const a = absenceOn(p.id, d);
                  const working = isWorkingDay(d);
                  return (
                    <td key={d} className={cn('h-9 px-px py-1', !working && 'bg-canvas', crowded.has(d) && 'bg-danger-subtle/50')}>
                      {a && working && (
                        <Tooltip content={`${fullName(p)} · ${ABSENCE_KIND[a.kind]} · du ${formatDate(a.start_date)} au ${formatDate(a.end_date)}${a.status === 'en_attente' ? ' · en attente' : ''}`}>
                          <span
                            className={cn('block h-5 w-full', a.status === 'validee' ? 'bg-accent' : 'border border-dashed border-accent bg-accent-subtle')}
                            aria-label={`${ABSENCE_KIND[a.kind]}${a.status === 'en_attente' ? ' en attente' : ''}`}
                          />
                        </Tooltip>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-surface-muted/40">
              <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2 text-left text-xs font-medium text-fg-subtle">
                Absents
              </th>
              {days.map((d) => (
                <td key={d} className={cn('tabular text-center text-xs', crowded.has(d) ? 'font-semibold text-danger' : 'text-fg-subtle')}>
                  {isWorkingDay(d) ? counts.get(d)?.size || '' : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-line px-4 py-2 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-5 bg-accent" aria-hidden />
          Validée
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-5 border border-dashed border-accent bg-accent-subtle" aria-hidden />
          En attente
        </span>
      </div>
    </Panel>
  );
}
