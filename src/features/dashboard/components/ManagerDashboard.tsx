import { CalendarPlus, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePeriod } from '@/app/providers/period';
import { AlertList } from '@/features/alerts/components/AlertList';
import { useAlerts } from '@/features/alerts/queries';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { formatDecimal, formatPercent, pluralize } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { SERIES, TrendChart } from '@/shared/ui/charts';
import { Stat, StatGroup } from '@/shared/ui/data';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { useManagerDashboard } from '../use-manager-dashboard';
import { UpcomingReviews } from './UpcomingReviews';

const pts = (delta: number) => `${formatDecimal(Math.abs(delta * 100)).replace(',0', '')} pt${Math.abs(delta * 100) >= 2 ? 's' : ''}`;
const trend = (d: number, eps = 0.005) => (d > eps ? 'up' : d < -eps ? 'down' : 'flat') as 'up' | 'down' | 'flat';

export function ManagerDashboard() {
  const { profile } = useCurrentUser();
  const { period } = usePeriod();
  const { data, byId, isLoading, error } = useManagerDashboard(period);
  const alerts = useAlerts();

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Tableau de bord' }]}
        title={`Bonjour ${profile.first_name}`}
        description={`Vue d’ensemble de l’équipe · ${period.label}`}
        actions={
          <>
            <Button asChild>
              <Link to="/rapports">
                <FileText aria-hidden />
                Rapport mensuel
              </Link>
            </Button>
            <Button asChild variant="primary">
              <Link to="/entretiens?planifier=1">
                <CalendarPlus aria-hidden />
                Planifier un entretien
              </Link>
            </Button>
          </>
        }
      />
      {error ? (
        <ErrorState error={error} />
      ) : !data || isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatGroup>
            <Stat
              label="Atteinte des objectifs"
              value={formatPercent(data.attainment)}
              delta={pts(data.attainmentDelta)}
              trend={trend(data.attainmentDelta)}
              hint="vs fin du mois dernier"
            />
            <Stat
              label="Charge moyenne de l’équipe"
              value={formatPercent(data.load, false)}
              delta={pts(data.loadDelta / 100)}
              trend={trend(data.loadDelta / 100)}
              upIsGood={false}
              hint="semaine en cours"
            />
            <Stat
              label="Tâches en retard"
              value={data.late.length}
              hint={`dont ${data.urgentLate} prioritaires · ${pluralize(data.doneInPeriod, 'terminée')} sur la période`}
            />
            <Stat label="Entretiens à préparer" value={data.toPrepare.length} hint={`sur ${pluralize(data.upcoming.length, 'entretien')} planifiés`} />
          </StatGroup>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="Évolution sur 6 mois" description="Fin de mois · météo ramenée sur 100">
              <TrendChart
                data={data.trend}
                xKey="mois"
                yDomain={[0, 120]}
                yTicks={[0, 30, 60, 90, 120]}
                formatY={(v) => `${v}`}
                series={[
                  { key: 'atteinte', label: 'Atteinte des objectifs (%)', color: SERIES.accent },
                  { key: 'charge', label: 'Charge moyenne (%)', color: SERIES.muted },
                  { key: 'meteo', label: 'Météo d’équipe', color: SERIES.warning, dashed: true },
                ]}
              />
            </Panel>
            <Panel
              title="Alertes"
              description={alerts.data ? pluralize(alerts.data.length, 'point', 'points') + ' à traiter' : undefined}
              actions={
                <Link to="/alertes" className="text-sm text-accent hover:underline">
                  Tout voir
                </Link>
              }
              flush
            >
              <AlertList alerts={alerts.data} limit={6} compact />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <UpcomingReviews reviews={data.upcoming.slice(0, 6)} byId={byId} />
            <Panel title="Météo d’équipe" description="Semaine en cours">
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-xl font-semibold">{data.mood === null ? '—' : formatDecimal(data.mood)}</span>
                  <span className="text-sm text-fg-muted">/ 5</span>
                  {data.mood !== null && data.moodPrev !== null && (
                    <span className="tabular text-xs text-fg-subtle">
                      semaine précédente : {formatDecimal(data.moodPrev)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg-muted">
                  {data.answered} réponse{data.answered > 1 ? 's' : ''} sur {data.teamSize} cette semaine.
                </p>
                <Link to="/meteo" className="text-sm text-accent hover:underline">
                  Voir l’évolution individuelle
                </Link>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </Page>
  );
}
