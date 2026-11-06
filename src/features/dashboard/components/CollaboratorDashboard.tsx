import { CloudSun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useObjectives } from '@/features/objectives/queries';
import { useWeather } from '@/features/weather/queries';
import { weekStartIso } from '@/shared/lib/dates';
import { formatDate, formatPercent } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/data';
import { EmptyState, TableSkeleton } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { MyActions } from './MyActions';
import { MyWeekTasks } from './MyWeekTasks';
import { NextReview } from './NextReview';

export function CollaboratorDashboard() {
  const { profile } = useCurrentUser();
  const objectives = useObjectives();
  const weather = useWeather();
  const answered = weather.data?.some((w) => w.collaborator_id === profile.id && w.week_start === weekStartIso(new Date()));

  return (
    <Page>
      <PageHeader breadcrumbs={[{ label: 'Mon espace' }, { label: 'Tableau de bord' }]} title={`Bonjour ${profile.first_name}`} description={profile.job_title} />
      <div className="flex flex-col gap-6">
        {weather.data && !answered && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <CloudSun className="size-4 text-fg-subtle" aria-hidden />
            <p className="flex-1 text-base">Vous n’avez pas encore saisi votre météo de la semaine.</p>
            <Button asChild size="sm" variant="primary">
              <Link to="/meteo">Saisir ma météo</Link>
            </Button>
          </div>
        )}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel
            title="Mes objectifs"
            actions={
              <Link to="/objectifs" className="text-sm text-accent hover:underline">
                Mettre à jour
              </Link>
            }
            flush
          >
            {!objectives.data ? (
              <TableSkeleton rows={3} columns={3} />
            ) : objectives.data.length === 0 ? (
              <EmptyState title="Aucun objectif" description="Vos objectifs apparaîtront ici dès que votre manager les aura définis." />
            ) : (
              <ul className="divide-y divide-line">
                {objectives.data.map((o) => {
                  const meta = OBJECTIVE_STATUS[o.status];
                  return (
                    <li key={o.id} className="flex flex-col gap-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-base font-medium">{o.title}</span>
                          <span className="text-xs text-fg-subtle">
                            {o.scope === 'equipe' ? 'Objectif d’équipe' : 'Objectif individuel'} · échéance le {formatDate(o.due_date)}
                          </span>
                        </div>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar value={o.progress} tone={meta.tone} label={`Avancement de ${o.title}`} />
                        <span className="tabular w-10 text-right text-sm">{formatPercent(o.progress)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <div className="flex flex-col gap-6">
            <NextReview />
            <MyActions />
          </div>
        </div>
        <MyWeekTasks />
      </div>
    </Page>
  );
}
