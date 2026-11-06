import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { useState } from 'react';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useTeamMembers } from '@/features/team/queries';
import { lastMonths } from '@/shared/lib/dates';
import { formatDate, formatDecimal, formatMonth, formatPercent, fullName } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Stat, StatGroup } from '@/shared/ui/data';
import { ErrorState, Skeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Panel, Toolbar } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';
import { downloadPersonReport, downloadTeamReport } from '../download';
import { buildMonthlyReport } from '../lib/monthly';
import { loadReportData } from '../report-data';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function ReportsPage() {
  const months = lastMonths(6).reverse();
  const [month, setMonth] = useState(monthKey(months[0]));
  const [person, setPerson] = useState('');
  const [busy, setBusy] = useState(false);
  const team = useTeamMembers();
  const data = useQuery({ queryKey: ['report-data'], queryFn: loadReportData });
  const report = data.data ? buildMonthlyReport(data.data, month) : null;

  const exportTeam = async () => {
    setBusy(true);
    await downloadTeamReport(month);
    setBusy(false);
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: 'Pilotage' }, { label: 'Rapports' }]}
        title="Rapports"
        description="Rapport mensuel d’équipe et fiches collaborateurs, exportables en PDF."
        actions={
          <Button variant="primary" onClick={() => void exportTeam()} disabled={busy || !report}>
            <FileDown aria-hidden />
            {busy ? 'Génération…' : 'Télécharger le PDF'}
          </Button>
        }
      />
      <Toolbar>
        <NativeSelect aria-label="Mois du rapport" className="w-56" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (
            <option key={monthKey(m)} value={monthKey(m)}>
              {formatMonth(m)}
            </option>
          ))}
        </NativeSelect>
        <div className="ml-auto flex items-center gap-2">
          <NativeSelect aria-label="Fiche collaborateur" className="w-64" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Fiche collaborateur…</option>
            {team.active.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </NativeSelect>
          <Button disabled={!person} onClick={() => void downloadPersonReport(person)}>
            <FileDown aria-hidden />
            Fiche PDF
          </Button>
        </div>
      </Toolbar>

      {data.error ? (
        <ErrorState error={data.error} onRetry={() => void data.refetch()} />
      ) : !report ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Rapport mensuel · {formatMonth(report.from)}</h2>
            <span className="text-sm text-fg-subtle">
              Du {formatDate(report.from)} au {formatDate(report.to)}
            </span>
          </div>
          <StatGroup>
            <Stat label="Atteinte des objectifs" value={formatPercent(report.kpis.attainment)} hint={`${report.objectives.length} objectifs suivis`} />
            <Stat label="Charge moyenne" value={report.kpis.load === null ? '—' : formatPercent(report.kpis.load, false)} hint="moyenne des semaines du mois" />
            <Stat label="Météo moyenne" value={report.kpis.mood === null ? '—' : `${formatDecimal(report.kpis.mood)} / 5`} hint={`${report.kpis.absentDays} jours d’absence`} />
            <Stat label="Tâches terminées" value={report.kpis.done} hint={`${report.kpis.late} en retard · ${report.kpis.reviews} entretiens tenus`} />
          </StatGroup>
          <Panel title="Par collaborateur" flush>
            <Table>
              <THead>
                <tr>
                  <Th>Collaborateur</Th>
                  <Th align="right">Objectifs</Th>
                  <Th align="right">Charge moy.</Th>
                  <Th align="right">Météo</Th>
                  <Th align="right">Tâches faites</Th>
                  <Th align="right">Absence (j)</Th>
                </tr>
              </THead>
              <TBody>
                {report.rows.map((r) => (
                  <Tr key={r.person.id}>
                    <Td className="font-medium">{fullName(r.person)}</Td>
                    <Td numeric>{r.progress === null ? '—' : formatPercent(r.progress)}</Td>
                    <Td numeric className={r.load !== null && r.load > 100 ? 'text-danger' : undefined}>
                      {r.load === null ? '—' : formatPercent(r.load, false)}
                    </Td>
                    <Td numeric>{r.mood === null ? '—' : formatDecimal(r.mood)}</Td>
                    <Td numeric>{r.done}</Td>
                    <Td numeric>{r.absent}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Panel>
          <Panel title="Objectifs" flush>
            <Table>
              <THead>
                <tr>
                  <Th>Objectif</Th>
                  <Th align="right">Échéance</Th>
                  <Th align="right">Avancement</Th>
                  <Th>Statut</Th>
                </tr>
              </THead>
              <TBody>
                {report.objectives.map((o) => (
                  <Tr key={o.id}>
                    <Td>{o.title}</Td>
                    <Td numeric>{formatDate(o.due_date)}</Td>
                    <Td numeric>{formatPercent(o.progress)}</Td>
                    <Td>
                      <Badge tone={OBJECTIVE_STATUS[o.status].tone}>{OBJECTIVE_STATUS[o.status].label}</Badge>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Panel>
        </div>
      )}
    </Page>
  );
}
