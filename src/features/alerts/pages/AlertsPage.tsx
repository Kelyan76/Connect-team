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
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Alertes' }]}
        title="Alertes"
        description="Générées automatiquement à partir des objectifs, de la charge, de la météo et du calendrier des entretiens."
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
          {(Object.keys(ALERT_KIND_LABEL) as AlertKind[]).map((k) => (
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
