import { useState } from 'react';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { formatDate, fullName } from '@/shared/lib/format';
import { isoWeekLabel, weekStartIso } from '@/shared/lib/dates';
import { PersonLabel } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/menu';
import type { Tables } from '@/shared/types/database';
import { loadLevel, weeklyLoad } from '../lib/load';
import { useSaveAllocation } from '../queries';

type Allocation = Tables<'workload_allocations'>;
type Project = Tables<'projects'>;
interface Thresholds {
  overload_pct: number;
  underload_pct: number;
}

const LEVEL_CLASS = {
  surcharge: 'bg-danger-subtle text-danger ring-1 ring-inset ring-danger/30',
  sous_charge: 'bg-warning-subtle text-warning ring-1 ring-inset ring-warning/30',
  normale: 'bg-surface-muted text-fg',
  vide: 'text-fg-subtle',
} as const;

function CellEditor({ person, week, allocations, projects }: { person: Person; week: string; allocations: Allocation[]; projects: Project[] }) {
  const save = useSaveAllocation();
  const mine = allocations.filter((a) => a.collaborator_id === person.id && a.week_start === week);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(projects.map((p) => [p.id, String(mine.find((a) => a.project_id === p.id)?.percent ?? '')])));
  const total = Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        for (const p of projects) {
          const next = Math.max(0, Math.min(200, Number(values[p.id]) || 0));
          const prev = mine.find((a) => a.project_id === p.id)?.percent ?? 0;
          if (next !== prev) save.mutate({ collaborator_id: person.id, project_id: p.id, week_start: week, percent: next });
        }
      }}
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium">{fullName(person)}</span>
        <span className="text-xs text-fg-subtle">Semaine du {formatDate(week)}</span>
      </div>
      <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {projects.map((p) => (
          <label key={p.id} className="grid grid-cols-[1fr_72px] items-center gap-2 text-sm">
            <span className="truncate">
              <span className="tabular text-fg-subtle">{p.code}</span> {p.name}
            </span>
            <Input inputMode="numeric" className="tabular h-7 text-right" aria-label={`Charge sur ${p.code} en %`} value={values[p.id]} onChange={(e) => setValues((v) => ({ ...v, [p.id]: e.target.value.replace(/[^\d]/g, '') }))} />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-3">
        <span className="tabular text-sm">Total : {total} %</span>
        <Button type="submit" size="sm" variant="primary" disabled={save.isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}

/** Grille collaborateurs × semaines, en pourcentage de capacité. */
export function LoadGrid({ people, weeks, allocations, projects, thresholds, editable }: { people: Person[]; weeks: string[]; allocations: Allocation[]; projects: Project[]; thresholds: Thresholds; editable: boolean }) {
  const loads = weeklyLoad(allocations);
  const current = weekStartIso(new Date());
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="border-b border-line bg-surface-muted/50">
            <th scope="col" className="sticky left-0 z-10 h-10 min-w-56 bg-surface px-4 text-left text-xs font-medium text-fg-subtle">
              Collaborateur
            </th>
            {weeks.map((w) => (
              <th key={w} scope="col" className={cn('tabular min-w-20 px-1 text-center text-xs font-medium', w === current ? 'text-fg' : 'text-fg-subtle')}>
                {isoWeekLabel(w)}
                {w === current && <span className="block text-xs font-normal text-accent">en cours</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {people.map((p) => (
            <tr key={p.id}>
              <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2 text-left font-normal">
                <PersonLabel person={p} detail={p.job_title} />
              </th>
              {weeks.map((w) => {
                const value = loads.get(p.id)?.get(w);
                const level = loadLevel(value, thresholds);
                const label = value ? `${value} %` : '—';
                const cell = (
                  <span className={cn('tabular flex h-8 w-full items-center justify-center rounded-sm text-sm font-medium', LEVEL_CLASS[level])}>{label}</span>
                );
                return (
                  <td key={w} className="px-1 py-2">
                    {editable ? (
                      <Popover>
                        <PopoverTrigger className="w-full rounded-sm" aria-label={`${fullName(p)}, ${isoWeekLabel(w)} : ${label}. Modifier`}>
                          {cell}
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="center">
                          <CellEditor person={p} week={w} allocations={allocations} projects={projects} />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      cell
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
