import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useSettings } from '@/features/settings/queries';
import { useProjects } from '@/features/tasks/queries';
import { useTeamMembers } from '@/features/team/queries';
import { formatDate, formatNumber } from '@/shared/lib/format';
import { isoAddDays, isoWeekLabel, nextWeeks } from '@/shared/lib/dates';
import { Button } from '@/shared/ui/button';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { Page, PageHeader, Toolbar } from '@/shared/ui/layout';
import { LoadGrid } from '../components/LoadGrid';
import { useAllocations } from '../queries';

export default function WorkloadPage() {
  const { isManager, profile } = useCurrentUser();
  const allocations = useAllocations();
  const settings = useSettings();
  const team = useTeamMembers();
  const projects = useProjects();
  const [offset, setOffset] = useState(-2);
  const weeks = nextWeeks(8, new Date(), offset);
  const people = isManager ? team.active : [profile];
  const s = settings.data;

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Organisation' : 'Mon espace' }, { label: isManager ? 'Plan de charge' : 'Ma charge' }]}
        title={isManager ? 'Plan de charge' : 'Ma charge'}
        description={
          s
            ? `Charge hebdomadaire en pourcentage de la capacité. Surcharge au-delà de ${s.overload_pct} %, sous-charge en dessous de ${s.underload_pct} %.`
            : 'Charge hebdomadaire en pourcentage de la capacité.'
        }
      />
      <Toolbar>
        <div className="flex items-center gap-2">
          <Button size="icon" aria-label="Semaines précédentes" onClick={() => setOffset((o) => o - 4)}>
            <ChevronLeft aria-hidden />
          </Button>
          <Button onClick={() => setOffset(-2)}>Aujourd’hui</Button>
          <Button size="icon" aria-label="Semaines suivantes" onClick={() => setOffset((o) => o + 4)}>
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <span className="tabular text-sm text-fg-muted">
          {isoWeekLabel(weeks[0])} – {isoWeekLabel(weeks[weeks.length - 1])} · du {formatDate(weeks[0])} au {formatDate(isoAddDays(weeks[weeks.length - 1], 4))}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-3 rounded-sm bg-danger-subtle ring-1 ring-inset ring-danger/40" aria-hidden />
            Surcharge
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block size-3 rounded-sm bg-warning-subtle ring-1 ring-inset ring-warning/40" aria-hidden />
            Sous-charge
          </span>
          {isManager && <span>{formatNumber(people.length)} collaborateurs · cliquez une case pour répartir la charge</span>}
        </div>
      </Toolbar>
      {allocations.error ? (
        <ErrorState error={allocations.error} onRetry={() => void allocations.refetch()} />
      ) : !allocations.data || !s || !projects.data ? (
        <Skeleton className="h-96" />
      ) : (
        <LoadGrid people={people} weeks={weeks} allocations={allocations.data} projects={projects.data} thresholds={s} editable={isManager} />
      )}
    </Page>
  );
}
