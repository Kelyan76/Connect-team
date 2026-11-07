import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { cn } from '@/shared/lib/cn';
import { daysFromToday } from '@/shared/lib/dates';
import { relativeDays } from '@/shared/lib/format';
import { EmptyState } from '@/shared/ui/feedback';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { PulseCheckin } from '../components/PulseCheckin';
import { TeamPulse } from '../components/TeamPulse';
import { ENERGY, ENERGY_COLOR, MOOD, MOOD_COLOR, WORKLOAD, WORKLOAD_COLOR } from '../lib/pulse';
import { usePulses } from '../queries';

function Chip({ icon: Icon, className, label }: { icon: typeof MOOD[1]['icon']; className: string; label: string }) {
  return (
    <span title={label} className={cn('flex size-8 items-center justify-center rounded', className)}>
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Historique personnel : les 20 derniers pouls, avec humeur, motivation et charge en couleur. */
function MyHistory() {
  const { profile } = useCurrentUser();
  const pulses = usePulses();
  const mine = (pulses.data ?? []).filter((p) => p.collaborator_id === profile.id).slice(0, 20);
  return (
    <Panel title="Mes derniers jours" flush>
      {mine.length === 0 ? (
        <EmptyState title="Pas encore de pouls" description="Votre premier pouls apparaîtra ici." />
      ) : (
        <ul className="stagger divide-y divide-line">
          {mine.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-24 shrink-0 text-sm font-medium capitalize">{relativeDays(daysFromToday(p.day))}</span>
              <span className="flex gap-1">
                <Chip icon={MOOD[p.mood].icon} className={MOOD_COLOR[p.mood].solid} label={`Humeur : ${MOOD[p.mood].label}`} />
                <Chip icon={ENERGY[p.energy].icon} className={ENERGY_COLOR[p.energy].solid} label={`Motivation : ${ENERGY[p.energy].label}`} />
                {p.workload !== null && (
                  <Chip icon={WORKLOAD[p.workload].icon} className={WORKLOAD_COLOR[p.workload].solid} label={`Charge : ${WORKLOAD[p.workload].label}`} />
                )}
              </span>
              {p.note && <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">« {p.note} »</span>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Page Pouls : saisie et historique (collaborateur), suivi de l'équipe (manager). Remplace la météo. */
export default function PulsePage() {
  const { isManager } = useCurrentUser();
  const team = useTeamMembers();
  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon suivi' }, { label: isManager ? 'Pouls' : 'Mon pouls' }]}
        title={isManager ? 'Pouls de l’équipe' : 'Mon pouls'}
        description={isManager ? 'Humeur, motivation et charge de chacun, jour après jour.' : 'Humeur, motivation et charge : 10 secondes par jour.'}
      />
      {isManager ? (
        <TeamPulse people={team.active} />
      ) : (
        <div className="flex flex-col gap-2">
          <PulseCheckin />
          <MyHistory />
        </div>
      )}
    </Page>
  );
}
