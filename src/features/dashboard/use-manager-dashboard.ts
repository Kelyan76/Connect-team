import { useMemo } from 'react';
import { useObjectives, useKrHistory } from '@/features/objectives/queries';
import { prepStatus } from '@/features/reviews/lib/review-rules';
import { useReviews } from '@/features/reviews/queries';
import { useTasks } from '@/features/tasks/queries';
import { useTeamMembers } from '@/features/team/queries';
import { useWeather } from '@/features/weather/queries';
import { weeklyLoad } from '@/features/workload/lib/load';
import { useAllocations } from '@/features/workload/queries';
import { daysFromToday, lastMonths, todayIso, weekStartIso } from '@/shared/lib/dates';
import { formatMonthShort } from '@/shared/lib/format';
import type { Period } from '@/shared/lib/period';
import { attainmentAt, mean, monthCheckpoints } from './lib/trends';

/** Indicateurs et séries du tableau de bord manager, calculés à partir des données de l'équipe. */
export function useManagerDashboard(period: Period) {
  const team = useTeamMembers();
  const objectives = useObjectives();
  const history = useKrHistory();
  const tasks = useTasks();
  const reviews = useReviews();
  const allocations = useAllocations();
  const weather = useWeather();

  const ready = !!(team.data && objectives.data && history.data && tasks.data && reviews.data && allocations.data && weather.data);

  const data = useMemo(() => {
    const objs = objectives.data;
    const hist = history.data;
    const allTasks = tasks.data;
    const revs = reviews.data;
    const allocs = allocations.data;
    const meteo = weather.data;
    if (!team.data || !objs || !hist || !allTasks || !revs || !allocs || !meteo) return undefined;
    const today = todayIso();
    const people = team.active.map((p) => p.id);
    const krs = objs.flatMap((o) => o.keyResults);
    const loads = weeklyLoad(allocs);
    const teamLoadOn = (week: string) => mean(people.map((p) => loads.get(p)?.get(week)));

    const months = lastMonths(6);
    const checkpoints = monthCheckpoints(months, today);
    const trend = months.map((m, i) => {
      const end = checkpoints[i];
      const monthWeeks = [...new Set(allocs.map((a) => a.week_start))].filter((w) => w.slice(0, 7) === end.slice(0, 7));
      const moods = meteo.filter((w) => w.week_start.slice(0, 7) === end.slice(0, 7)).map((w) => w.mood);
      const att = attainmentAt(end, objs, krs, hist);
      const load = mean(monthWeeks.map(teamLoadOn));
      const mood = mean(moods);
      return {
        mois: formatMonthShort(m),
        atteinte: att === null ? null : Math.round(att * 100),
        charge: load === null ? null : Math.round(load),
        meteo: mood === null ? null : Math.round((mood / 5) * 100),
      };
    });

    const attainment = mean(objs.map((o) => o.progress)) ?? 0;
    const lastMonth = attainmentAt(checkpoints[checkpoints.length - 2], objs, krs, hist) ?? attainment;
    const thisWeek = weekStartIso(new Date());
    const prevWeek = weekStartIso(new Date(Date.now() - 7 * 86400000));
    const load = teamLoadOn(thisWeek) ?? 0;
    const loadPrev = teamLoadOn(prevWeek) ?? load;
    const openTasks = allTasks.filter((t) => t.status !== 'termine');
    const late = openTasks.filter((t) => t.due_date && t.due_date < today);
    const doneInPeriod = allTasks.filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= period.from && t.completed_at.slice(0, 10) <= period.to);
    const upcoming = revs.filter((r) => r.status === 'planifie' && daysFromToday(r.scheduled_at.slice(0, 10)) >= 0)
      .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    const toPrepare = upcoming.filter((r) => daysFromToday(r.scheduled_at.slice(0, 10)) <= 15 && prepStatus(r) !== 'pret');
    const weekMoods = meteo.filter((w) => w.week_start === thisWeek);
    const prevMoods = meteo.filter((w) => w.week_start === prevWeek);

    return {
      trend,
      attainment,
      attainmentDelta: attainment - lastMonth,
      load,
      loadDelta: load - loadPrev,
      late,
      urgentLate: late.filter((t) => t.priority === 'urgente' || t.priority === 'haute').length,
      doneInPeriod: doneInPeriod.length,
      upcoming,
      toPrepare,
      mood: mean(weekMoods.map((w) => w.mood)),
      moodPrev: mean(prevMoods.map((w) => w.mood)),
      answered: weekMoods.length,
      teamSize: people.length,
    };
  }, [team.data, team.active, objectives.data, history.data, tasks.data, reviews.data, allocations.data, weather.data, period.from, period.to]);

  const queries = [team, history, tasks, reviews, allocations, weather];
  return {
    data,
    byId: team.byId,
    isLoading: !ready && !queries.some((q) => q.error) && !objectives.error,
    error: queries.find((q) => q.error)?.error ?? objectives.error,
  };
}
