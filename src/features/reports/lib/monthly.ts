import { endOfMonth, startOfMonth } from 'date-fns';
import { workingDaysCount } from '@/features/absences/lib/overlap';
import { mean } from '@/features/dashboard/lib/trends';
import { weeklyLoad } from '@/features/workload/lib/load';
import { toIsoDate } from '@/shared/lib/dates';
import { toDate } from '@/shared/lib/format';
import type { ReportData } from '../report-data';

/** Indicateurs du rapport mensuel d'équipe, pour un mois donné (« AAAA-MM »). */
export function buildMonthlyReport(data: ReportData, month: string) {
  const from = toIsoDate(startOfMonth(toDate(`${month}-01`)));
  const to = toIsoDate(endOfMonth(toDate(`${month}-01`)));
  const inMonth = (d: string | null) => !!d && d.slice(0, 10) >= from && d.slice(0, 10) <= to;
  const members = data.people.filter((p) => p.role === 'collaborateur' && p.is_active);
  const loads = weeklyLoad(data.workload);
  const weeks = [...new Set(data.workload.map((w) => w.week_start))].filter((w) => w >= from && w <= to);

  const rows = members.map((p) => {
    const load = mean(weeks.map((w) => loads.get(p.id)?.get(w)));
    const mood = mean(data.weather.filter((w) => w.collaborator_id === p.id && w.week_start >= from && w.week_start <= to).map((w) => w.mood));
    const done = data.tasks.filter((t) => t.assignee_id === p.id && inMonth(t.completed_at)).length;
    const objectives = data.objectives.filter((o) => o.owner_id === p.id);
    const progress = mean(objectives.map((o) => o.progress));
    const absent = data.absences
      .filter((a) => a.collaborator_id === p.id && a.status === 'validee' && a.end_date >= from && a.start_date <= to)
      .reduce((n, a) => n + workingDaysCount(a.start_date < from ? from : a.start_date, a.end_date > to ? to : a.end_date), 0);
    return { person: p, load, mood, done, progress, absent };
  });

  const held = data.reviews.filter((r) => r.status === 'termine' && inMonth(r.scheduled_at));
  const today = toIsoDate(new Date());
  return {
    from,
    to,
    rows,
    held,
    objectives: data.objectives,
    kpis: {
      attainment: mean(data.objectives.map((o) => o.progress)) ?? 0,
      load: mean(rows.map((r) => r.load)),
      mood: mean(rows.map((r) => r.mood)),
      done: rows.reduce((n, r) => n + r.done, 0),
      late: data.tasks.filter((t) => t.status !== 'termine' && t.due_date && t.due_date < today).length,
      reviews: held.length,
      absentDays: rows.reduce((n, r) => n + r.absent, 0),
    },
  };
}

export type MonthlyReport = ReturnType<typeof buildMonthlyReport>;
