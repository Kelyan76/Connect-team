import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { AlertList } from '../components/AlertList';
import { ALERT_GROUP_ORDER, ALERT_GROUPS, byPerson, groupOf, type AlertGroup } from '../lib/alerts';
import { useAlerts } from '../queries';

const STEP = 5;

/** Signaux faibles rangés en quatre menus ; « À voir en priorité » présente une carte par personne. */
export default function AlertsPage() {
  const alerts = useAlerts();
  const team = useTeamMembers();
  const [group, setGroup] = useState<AlertGroup | null>(null);
  const [shown, setShown] = useState(STEP);

  const count = (g: AlertGroup) => alerts.data?.filter((a) => groupOf(a) === g).length ?? 0;
  const firstFull = ALERT_GROUP_ORDER.find((g) => count(g) > 0) ?? 'personnes';
  const current = group ?? firstFull;
  const list = (alerts.data ?? []).filter((a) => groupOf(a) === current);
  useEffect(() => setShown(STEP), [current]);

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Signaux faibles' }]}
        title="Signaux faibles"
        description="Ce que vous êtes peut-être en train de rater. Un signal invite à un échange, jamais à une sanction."
        actions={
          <Button asChild variant="ghost">
            <Link to="/parametres">
              <SlidersHorizontal aria-hidden />
              Seuils
            </Link>
          </Button>
        }
      />
      {alerts.error ? (
        <ErrorState error={alerts.error} />
      ) : !alerts.data ? (
        <Skeleton className="h-80" />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <Segmented value={current} onValueChange={(v) => setGroup(v as AlertGroup)} aria-label="Type de signal">
              {ALERT_GROUP_ORDER.map((g) => (
                <SegmentedItem key={g} value={g}>
                  {ALERT_GROUPS[g].label}
                  <span className={cn('tabular rounded-full px-2 text-xs', count(g) && g === 'personnes' ? 'bg-danger text-white' : 'bg-surface-muted text-fg-subtle')}>{count(g)}</span>
                </SegmentedItem>
              ))}
            </Segmented>
          </div>
          <p className="text-sm text-fg-muted">{ALERT_GROUPS[current].description}</p>

          {list.length === 0 ? (
            <Panel>
              <EmptyState title="Rien à signaler" description="Aucun signal dans ce menu pour le moment." />
            </Panel>
          ) : current === 'personnes' ? (
            <ul className="stagger grid gap-4 md:grid-cols-2">
              {byPerson(list).map(({ personId, alerts: mine }) => {
                const p = personId ? team.byId.get(personId) : undefined;
                const urgent = mine.some((a) => a.severity === 'danger');
                return (
                  <li key={personId ?? 'equipe'} className={cn('flex flex-col gap-3 rounded-lg border bg-surface p-4 shadow-sm', urgent ? 'border-danger/20' : 'border-line')}>
                    <div className="flex items-center gap-3">
                      {p && <Avatar person={p} size="lg" />}
                      <span className="flex min-w-0 flex-col">
                        <span className="text-md font-semibold">{p ? fullName(p) : 'Équipe'}</span>
                        <span className={cn('text-sm', urgent ? 'text-danger' : 'text-warning')}>
                          {mine.length > 1 ? `${mine.length} signaux` : '1 signal'}
                        </span>
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {mine.map((a) => (
                        <li key={a.id} className="flex flex-col">
                          <span className="text-base">{a.title}</span>
                          <span className="text-sm text-fg-subtle">{a.detail}</span>
                        </li>
                      ))}
                    </ul>
                    {p && (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="primary">
                          <Link to={`/equipe/${p.id}`}>
                            Comprendre la situation
                            <ArrowRight aria-hidden />
                          </Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link to={`/posture?collaborateur=${p.id}`}>Décider</Link>
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Panel flush>
              <AlertList alerts={list.slice(0, shown)} />
              {list.length > shown && (
                <button type="button" className="w-full border-t border-line px-4 py-3 text-sm font-medium text-accent hover:bg-surface-muted/50" onClick={() => setShown((s) => s + STEP)}>
                  Voir {Math.min(STEP, list.length - shown)} de plus ({list.length - shown} restants)
                </button>
              )}
            </Panel>
          )}
        </div>
      )}
    </Page>
  );
}
