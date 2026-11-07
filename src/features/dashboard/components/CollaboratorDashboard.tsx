import { CloudSun } from 'lucide-react';
import { useState } from 'react';
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
import { Page, Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { HeroBanner } from './HeroBanner';
import { MyActions } from './MyActions';
import { MyWeekTasks } from './MyWeekTasks';
import { NextReview } from './NextReview';

type View = 'objectifs' | 'semaine' | 'entretien';

/** Accueil du collaborateur : un rappel météo si besoin, puis un bloc à la fois. */
export function CollaboratorDashboard() {
  const { profile } = useCurrentUser();
  const objectives = useObjectives();
  const weather = useWeather();
  const answered = weather.data?.some((w) => w.collaborator_id === profile.id && w.week_start === weekStartIso(new Date()));
  const [view, setView] = useState<View>('objectifs');

  return (
    <Page>
      <HeroBanner title={`Bonjour ${profile.first_name}`} subtitle={`${profile.job_title} · bonne semaine !`} />
      <div className="flex flex-col gap-4">
        {weather.data && !answered && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-accent-subtle px-5 py-4">
            <CloudSun className="size-5 text-accent" aria-hidden />
            <p className="flex-1 text-base text-fg">Comment s’est passée votre semaine ?</p>
            <Button asChild size="sm" variant="primary">
              <Link to="/meteo">Saisir ma météo</Link>
            </Button>
          </div>
        )}

        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented value={view} onValueChange={(v) => setView(v as View)} aria-label="Afficher">
            <SegmentedItem value="objectifs">Mes objectifs</SegmentedItem>
            <SegmentedItem value="semaine">Ma semaine</SegmentedItem>
            <SegmentedItem value="entretien">Entretien</SegmentedItem>
          </Segmented>
        </div>

        {view === 'objectifs' && (
          <Panel
            title="Mes objectifs"
            actions={
              <Link to="/objectifs" className="text-sm font-medium text-accent hover:underline">
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
              <ul className="stagger divide-y divide-line">
                {objectives.data.map((o) => {
                  const meta = OBJECTIVE_STATUS[o.status];
                  return (
                    <li key={o.id} className="flex flex-col gap-3 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col">
                          <span className="text-base font-medium">{o.title}</span>
                          <span className="text-sm text-fg-subtle">
                            {o.scope === 'equipe' ? 'Objectif d’équipe' : 'Objectif individuel'} · {formatDate(o.due_date)}
                          </span>
                        </div>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar value={o.progress} tone={meta.tone} label={`Avancement de ${o.title}`} />
                        <span className="tabular w-10 text-right text-sm font-medium">{formatPercent(o.progress)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        )}

        {view === 'semaine' && <MyWeekTasks />}

        {view === 'entretien' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <NextReview />
            <MyActions />
          </div>
        )}
      </div>
    </Page>
  );
}
