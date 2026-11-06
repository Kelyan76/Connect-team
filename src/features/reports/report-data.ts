import * as objectivesApi from '@/features/objectives/api';
import { objectiveProgress, objectiveStatus } from '@/features/objectives/lib/status';
import * as reviewsApi from '@/features/reviews/api';
import * as teamApi from '@/features/team/api';
import { listTable } from '@/shared/lib/crud';
import { todayIso } from '@/shared/lib/dates';
import { queryClient } from '@/shared/lib/query-client';
import { qk } from '@/shared/lib/query-keys';

/** Données des rapports, lues via le cache TanStack Query (mêmes clés que les écrans). */
export async function loadReportData() {
  const get = <T>(queryKey: readonly unknown[], queryFn: () => Promise<T>) => queryClient.fetchQuery({ queryKey, queryFn, staleTime: 30_000 });
  const [people, objectives, krs, reviews, actions, feedbacks, weather, workload, tasks, absences, skills, levels, team] = await Promise.all([
    get(qk.people, teamApi.listPeople),
    get(qk.objectives, objectivesApi.listObjectives),
    get(qk.keyResults, objectivesApi.listKeyResults),
    get(qk.reviews, reviewsApi.listReviews),
    get(qk.reviewActions, reviewsApi.listActions),
    get(qk.feedbacks, () => listTable('feedbacks', 'created_at', false)),
    get(qk.weather, () => listTable('weather_entries', 'week_start')),
    get(qk.workload, () => listTable('workload_allocations', 'week_start')),
    get(qk.tasks, () => listTable('tasks', 'position')),
    get(qk.absences, () => listTable('absences', 'start_date')),
    get(qk.skills, () => listTable('skills', 'category')),
    get(qk.skillLevels, () => listTable('skill_levels', 'skill_id')),
    get(qk.team, () => listTable('teams', 'name')),
  ]);
  const today = todayIso();
  const objectiveViews = objectives
    .filter((o) => !o.archived)
    .map((o) => {
      const mine = krs.filter((k) => k.objective_id === o.id);
      const progress = objectiveProgress(mine);
      return { ...o, keyResults: mine, progress, status: objectiveStatus(o, progress, today) };
    });
  return { people, objectives: objectiveViews, reviews, actions, feedbacks, weather, workload, tasks, absences, skills, levels, company: team[0]?.company ?? '' };
}

export type ReportData = Awaited<ReturnType<typeof loadReportData>>;

/** Le PDF utilise les polices standard : espaces insécables remplacées par des espaces simples. */
const NNBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0xa0);
export const pdfText = (t: string) => t.split(NNBSP).join(' ').split(NBSP).join(' ');
