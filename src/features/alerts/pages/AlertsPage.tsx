import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { Segmented, SegmentedItem } from '@/shared/ui/toggle';
import { AlertList } from '../components/AlertList';
import { ALERT_KIND_LABEL, type AlertKind } from '../lib/alerts';
import { useAlerts } from '../queries';

export default function AlertsPage() {
  const alerts = useAlerts();
  const [kind, setKind] = useState('toutes');
  const list = alerts.data?.filter((a) => kind === 'toutes' || a.kind === kind);
  const count = (k: AlertKind) => alerts.data?.filter((a) => a.kind === k).length ?? 0;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Signaux faibles' }]}
        title="Signaux faibles"
        description="Ce que vous êtes peut-être en train de rater : pouls, échéances, reconnaissance, 1 à 1. Un signal invite à un échange, jamais à une sanction."
        actions={
          <Button asChild>
            <Link to="/parametres">
              <SlidersHorizontal aria-hidden />
              Seuils d’alerte
            </Link>
          </Button>
        }
      />
      <div className="pb-3">
        <Segmented value={kind} onValueChange={setKind} aria-label="Type d’alerte" className="h-auto flex-wrap">
          <SegmentedItem value="toutes">Toutes · {alerts.data?.length ?? 0}</SegmentedItem>
          {(Object.keys(ALERT_KIND_LABEL) as AlertKind[]).filter((k) => count(k) > 0).map((k) => (
            <SegmentedItem key={k} value={k} className="h-7">
              {ALERT_KIND_LABEL[k]} · {count(k)}
            </SegmentedItem>
          ))}
        </Segmented>
      </div>
      {alerts.error ? (
        <ErrorState error={alerts.error} />
      ) : (
        <Panel flush>
          <AlertList alerts={list} />
        </Panel>
      )}
    </Page>
  );
}
