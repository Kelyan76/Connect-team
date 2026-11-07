import { CalendarPlus, ClipboardList, FileText, Gauge, MessageSquareText, Target } from 'lucide-react';
import { useState } from 'react';
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
import { Page, Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { useManagerDashboard } from '../use-manager-dashboard';
import { HeroBanner } from './HeroBanner';
import { UpcomingReviews } from './UpcomingReviews';

const pts = (delta: number) => `${formatDecimal(Math.abs(delta * 100)).replace(',0', '')} pt${Math.abs(delta * 100) >= 2 ? 's' : ''}`;
const trend = (d: number, eps = 0.005) => (d > eps ? 'up' : d < -eps ? 'down' : 'flat') as 'up' | 'down' | 'flat';

type View = 'alertes' | 'entretiens' | 'evolution' | 'meteo';

/**
 * Accueil du manager : quatre chiffres clés, puis un seul bloc à la fois
 * (alertes, entretiens, évolution, météo) choisi dans un menu, pour garder la page légère.
 */
export function ManagerDashboard() {
  const { profile } = useCurrentUser();
  const { period } = usePeriod();
  const { data, byId, isLoading, error } = useManagerDashboard(period);
  const alerts = useAlerts();
  const [view, setView] = useState<View>('alertes');

  return (
    <Page>
      <HeroBanner title={`Bonjour ${profile.first_name}`} subtitle={`Voici l’essentiel de votre équipe · ${period.label}`}>
        <Button asChild className="flex-1 border-white/30 bg-white/15 text-white shadow-none hover:bg-white/25 sm:flex-none">
          <Link to="/rapports">
            <FileText aria-hidden />
            Rapport
          </Link>
        </Button>
        <Button asChild className="flex-1 border-transparent bg-white text-accent hover:bg-white/90 sm:flex-none">
          <Link to="/entretiens?planifier=1">
            <CalendarPlus aria-hidden />
            Planifier un entretien
          </Link>
        </Button>
      </HeroBanner>
      {error ? (
        <ErrorState error={error} />
      ) : !data || isLoading ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <StatGroup>
            <Stat
              icon={Target}
              tone="accent"
              label="Objectifs atteints"
              value={formatPercent(data.attainment)}
              delta={pts(data.attainmentDelta)}
              trend={trend(data.attainmentDelta)}
              hint="vs mois dernier"
            />
            <Stat
              icon={Gauge}
              tone="success"
              label="Charge de l’équipe"
              value={formatPercent(data.load, false)}
              delta={pts(data.loadDelta / 100)}
              trend={trend(data.loadDelta / 100)}
              upIsGood={false}
              hint="cette semaine"
            />
            <Stat icon={ClipboardList} tone="danger" label="Tâches en retard" value={data.late.length} hint={`dont ${data.urgentLate} prioritaires`} />
            <Stat
              icon={MessageSquareText}
              tone="warning"
              label="Entretiens à préparer"
              value={data.toPrepare.length}
              hint={`sur ${pluralize(data.upcoming.length, 'prévu', 'prévus')}`}
            />
          </StatGroup>

          <div className="flex flex-col gap-4">
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <Segmented value={view} onValueChange={(v) => setView(v as View)} aria-label="Afficher">
                <SegmentedItem value="alertes">
                  Alertes{alerts.data?.length ? <span className="tabular text-xs text-fg-subtle">{alerts.data.length}</span> : null}
                </SegmentedItem>
                <SegmentedItem value="entretiens">Entretiens</SegmentedItem>
                <SegmentedItem value="evolution">Évolution</SegmentedItem>
                <SegmentedItem value="meteo">Météo</SegmentedItem>
              </Segmented>
            </div>

            {view === 'alertes' && (
              <Panel
                title="Points à traiter"
                actions={
                  <Link to="/alertes" className="text-sm font-medium text-accent hover:underline">
                    Tout voir
                  </Link>
                }
                flush
              >
                <AlertList alerts={alerts.data} limit={6} compact />
              </Panel>
            )}

            {view === 'entretiens' && <UpcomingReviews reviews={data.upcoming.slice(0, 6)} byId={byId} />}

            {view === 'evolution' && (
              <Panel title="Évolution sur 6 mois" description="Fin de mois · météo ramenée sur 100">
                <TrendChart
                  data={data.trend}
                  xKey="mois"
                  yDomain={[0, 120]}
                  yTicks={[0, 30, 60, 90, 120]}
                  formatY={(v) => `${v}`}
                  series={[
                    { key: 'atteinte', label: 'Objectifs (%)', color: SERIES.accent },
                    { key: 'charge', label: 'Charge (%)', color: SERIES.muted },
                    { key: 'meteo', label: 'Météo', color: SERIES.warning, dashed: true },
                  ]}
                />
              </Panel>
            )}

            {view === 'meteo' && (
              <Panel title="Météo d’équipe" description="Semaine en cours">
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="tabular text-xl font-semibold">{data.mood === null ? '—' : formatDecimal(data.mood)}</span>
                    <span className="text-sm text-fg-muted">/ 5</span>
                    {data.mood !== null && data.moodPrev !== null && (
                      <span className="tabular text-sm text-fg-subtle">· semaine précédente {formatDecimal(data.moodPrev)}</span>
                    )}
                  </div>
                  <p className="text-sm text-fg-muted">
                    {data.answered} réponse{data.answered > 1 ? 's' : ''} sur {data.teamSize} cette semaine.
                  </p>
                  <Link to="/meteo" className="text-sm font-medium text-accent hover:underline">
                    Voir le détail par collaborateur
                  </Link>
                </div>
              </Panel>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
