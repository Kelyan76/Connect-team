import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { isoWeekLabel, lastWeeks } from '@/shared/lib/dates';
import { formatDecimal } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { SERIES, Sparkline, TrendChart } from '@/shared/ui/charts';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Tooltip } from '@/shared/ui/menu';
import { hasMoodDrop, teamSeries } from '../lib/weather';
import { useWeather } from '../queries';

const MOOD_BG = ['', 'bg-danger-subtle text-danger', 'bg-warning-subtle text-warning', 'bg-surface-muted text-fg-muted', 'bg-success-subtle text-success', 'bg-success-subtle text-success'];

/** Vue manager : moyenne d'équipe sur 12 semaines et évolution individuelle. */
export function TeamWeather() {
  const weather = useWeather();
  const team = useTeamMembers();
  if (weather.error) return <ErrorState error={weather.error} />;
  if (!weather.data || team.isLoading) return <Skeleton className="h-96" />;

  const weeks = lastWeeks(12);
  const recent = weeks.slice(-8);
  const mood = teamSeries(weather.data, weeks, 'mood');
  const load = teamSeries(weather.data, weeks, 'workload');
  const chart = weeks.map((w, i) => ({ semaine: isoWeekLabel(w), humeur: mood[i] === null ? null : Number(mood[i]?.toFixed(2)), charge: load[i] === null ? null : Number(load[i]?.toFixed(2)) }));

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Moyenne d’équipe" description="12 dernières semaines, échelle de 1 à 5">
        <TrendChart
          data={chart}
          xKey="semaine"
          height={200}
          yDomain={[1, 5]}
          yTicks={[1, 2, 3, 4, 5]}
          formatY={(v) => formatDecimal(v)}
          series={[
            { key: 'humeur', label: 'Humeur', color: SERIES.accent },
            { key: 'charge', label: 'Charge ressentie', color: SERIES.warning, dashed: true },
          ]}
        />
      </Panel>
      <Panel title="Évolution individuelle" description="Humeur déclarée, 8 dernières semaines" flush>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-base">
            <thead>
              <tr className="border-b border-line bg-surface-muted/50">
                <th scope="col" className="h-8 px-4 text-left text-xs font-medium text-fg-subtle">
                  Collaborateur
                </th>
                {recent.map((w) => (
                  <th key={w} scope="col" className="tabular px-1 text-center text-xs font-medium text-fg-subtle">
                    {isoWeekLabel(w)}
                  </th>
                ))}
                <th scope="col" className="px-4 text-left text-xs font-medium text-fg-subtle">
                  Tendance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {team.active.map((p) => {
                const mine = weather.data.filter((w) => w.collaborator_id === p.id);
                const drop = hasMoodDrop(mine, 3);
                return (
                  <tr key={p.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-2">
                      <PersonLabel person={p} detail={drop ? 'Baisse sur 3 semaines' : p.job_title} />
                    </td>
                    {recent.map((w) => {
                      const e = mine.find((x) => x.week_start === w);
                      return (
                        <td key={w} className="px-1 py-2 text-center">
                          {e ? (
                            <Tooltip content={`Humeur ${e.mood} · charge ${e.workload}${e.comment ? ` · « ${e.comment} »` : ''}`}>
                              <span className={cn('tabular mx-auto flex size-7 items-center justify-center rounded-sm text-xs font-semibold', MOOD_BG[e.mood], e.comment && 'underline decoration-dotted underline-offset-2')}>
                                {e.mood}
                              </span>
                            </Tooltip>
                          ) : (
                            <span className="text-xs text-fg-subtle" aria-label="Pas de réponse">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className={cn('px-4 py-2', drop && 'text-danger')}>
                      <Sparkline values={recent.map((w) => mine.find((x) => x.week_start === w)?.mood ?? null)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
