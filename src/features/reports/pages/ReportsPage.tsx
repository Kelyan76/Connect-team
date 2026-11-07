import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, CloudSun, FileDown, Gauge, Target } from 'lucide-react';
import { useState } from 'react';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useTeamMembers } from '@/features/team/queries';
import { lastMonths } from '@/shared/lib/dates';
import { formatDate, formatDecimal, formatMonth, formatPercent, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressBar, Stat, StatGroup } from '@/shared/ui/data';
import { EmptyState, ErrorState, Skeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Panel } from '@/shared/ui/layout';
import { downloadPersonReport, downloadTeamReport } from '../download';
import { buildMonthlyReport, type MonthlyReport } from '../lib/monthly';
import { loadReportData } from '../report-data';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const TEAM = '';

function ObjectiveList({ objectives }: { objectives: MonthlyReport['objectives'] }) {
  if (objectives.length === 0) return <EmptyState title="Aucun objectif" description="Aucun objectif suivi sur cette période." />;
  return (
    <ul className="divide-y divide-line">
      {objectives.map((o) => {
        const meta = OBJECTIVE_STATUS[o.status];
        return (
          <li key={o.id} className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-base font-medium">{o.title}</span>
                <span className="text-sm text-fg-subtle">Échéance le {formatDate(o.due_date)}</span>
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
  );
}

/** Rapport mensuel : l'équipe entière ou un collaborateur choisi dans un menu. */
export default function ReportsPage() {
  const months = lastMonths(6).reverse();
  const [month, setMonth] = useState(monthKey(months[0]));
  const [personId, setPersonId] = useState(TEAM);
  const [busy, setBusy] = useState(false);
  const team = useTeamMembers();
  const data = useQuery({ queryKey: ['report-data'], queryFn: loadReportData });
  const report = data.data ? buildMonthlyReport(data.data, month) : null;
  const row = report && personId ? report.rows.find((r) => r.person.id === personId) : undefined;

  const download = async () => {
    setBusy(true);
    try {
      if (personId) await downloadPersonReport(personId);
      else await downloadTeamReport(month);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Rapports' }]}
        title="Rapport mensuel"
        description="Choisissez un mois et, si besoin, un collaborateur."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <NativeSelect aria-label="Mois du rapport" className="sm:w-56" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={monthKey(m)} value={monthKey(m)}>
              {formatMonth(m)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Collaborateur" className="sm:w-72" value={personId} onChange={(e) => setPersonId(e.target.value)}>
          <option value={TEAM}>Toute l’équipe</option>
          {team.active.map((p) => (
            <option key={p.id} value={p.id}>
              {fullName(p)}
            </option>
          ))}
        </NativeSelect>
        <Button variant="primary" size="lg" className="sm:ml-auto" onClick={() => void download()} disabled={busy || !report}>
          <FileDown aria-hidden />
          {busy ? 'Génération…' : personId ? 'Fiche PDF' : 'Rapport PDF'}
        </Button>
      </div>

      {data.error ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : !report ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : personId && row ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <Avatar person={row.person} size="lg" />
            <div className="flex min-w-0 flex-col">
              <h2 className="truncate text-lg font-semibold">{fullName(row.person)}</h2>
              <span className="truncate text-sm text-fg-subtle">
                {row.person.job_title} · {formatMonth(report.from)}
              </span>
            </div>
          </div>
          <StatGroup>
            <Stat icon={Target} label="Objectifs" value={row.progress === null ? '—' : formatPercent(row.progress)} hint="avancement moyen" />
            <Stat
              icon={Gauge}
              tone="success"
              label="Charge moyenne"
              value={<span className={row.load !== null && row.load > 100 ? 'text-danger' : undefined}>{row.load === null ? '—' : formatPercent(row.load, false)}</span>}
              hint="sur le mois"
            />
            <Stat icon={CloudSun} tone="warning" label="Météo" value={row.mood === null ? '—' : `${formatDecimal(row.mood)} / 5`} hint="moyenne du mois" />
            <Stat icon={CheckCircle2} tone="violet" label="Tâches terminées" value={row.done} hint={`${row.absent} j d’absence`} />
          </StatGroup>
          <Panel title="Ses objectifs" flush>
            <ObjectiveList objectives={report.objectives.filter((o) => o.owner_id === personId)} />
          </Panel>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-fg-subtle">
            Du {formatDate(report.from)} au {formatDate(report.to)}
          </p>
          <StatGroup>
            <Stat icon={Target} label="Objectifs atteints" value={formatPercent(report.kpis.attainment)} hint={`${report.objectives.length} objectifs suivis`} />
            <Stat icon={Gauge} tone="success" label="Charge moyenne" value={report.kpis.load === null ? '—' : formatPercent(report.kpis.load, false)} hint="sur le mois" />
            <Stat icon={CloudSun} tone="warning" label="Météo moyenne" value={report.kpis.mood === null ? '—' : `${formatDecimal(report.kpis.mood)} / 5`} hint={`${report.kpis.absentDays} j d’absence`} />
            <Stat icon={CheckCircle2} tone="violet" label="Tâches terminées" value={report.kpis.done} hint={`${report.kpis.late} en retard`} />
          </StatGroup>
          <Panel title="Objectifs de l’équipe" flush>
            <ObjectiveList objectives={report.objectives} />
          </Panel>
        </div>
      )}
    </Page>
  );
}
