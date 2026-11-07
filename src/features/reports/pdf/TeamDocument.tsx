import { Document, Page, Text } from '@react-pdf/renderer';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { KIND_LABEL } from '@/features/reviews/lib/review-rules';
import { formatDate, formatDecimal, formatMonth, formatPercent, fullName } from '@/shared/lib/format';
import type { MonthlyReport } from '../lib/monthly';
import { pdfText } from '../report-data';
import { Footer, Header, Kpis, PdfTable } from './parts';
import { s } from './styles';

const pct = (v: number | null, ratio = true) => (v === null ? '—' : pdfText(formatPercent(v, ratio)));

/** Rapport mensuel d'équipe. */
export function TeamDocument({ report, company }: { report: MonthlyReport; company: string }) {
  const k = report.kpis;
  return (
    <Document title={`Rapport mensuel ${formatMonth(report.from)}`} author="Connect Team" language="fr">
      <Page size="A4" style={s.page}>
        <Header company={company} kind="Rapport mensuel d’équipe" />
        <Text style={s.title}>Rapport mensuel · {formatMonth(report.from)}</Text>
        <Text style={s.subtitle}>
          Du {formatDate(report.from)} au {formatDate(report.to)} · {report.rows.length} collaborateurs
        </Text>
        <Kpis
          items={[
            { label: 'Atteinte des objectifs', value: pct(k.attainment) },
            { label: 'Charge moyenne', value: pct(k.load, false) },
            { label: 'Humeur moyenne', value: k.mood === null ? '—' : `${formatDecimal(k.mood)} / 5` },
            { label: 'Tâches terminées', value: String(k.done) },
          ]}
        />
        <Kpis
          items={[
            { label: 'Tâches en retard', value: String(k.late) },
            { label: 'Entretiens tenus', value: String(k.reviews) },
            { label: 'Jours d’absence', value: String(k.absentDays) },
            { label: 'Objectifs suivis', value: String(report.objectives.length) },
          ]}
        />

        <Text style={s.h2}>Collaborateurs</Text>
        <PdfTable
          rows={report.rows}
          columns={[
            { label: 'Collaborateur', width: 30, render: (r) => fullName(r.person) },
            { label: 'Objectifs', width: 14, right: true, render: (r) => pct(r.progress) },
            { label: 'Charge moy.', width: 14, right: true, render: (r) => pct(r.load, false) },
            { label: 'Humeur', width: 14, right: true, render: (r) => (r.mood === null ? '—' : formatDecimal(r.mood)) },
            { label: 'Tâches faites', width: 14, right: true, render: (r) => String(r.done) },
            { label: 'Absence (j)', width: 14, right: true, render: (r) => String(r.absent) },
          ]}
        />

        <Text style={s.h2}>Objectifs</Text>
        <PdfTable
          rows={report.objectives}
          columns={[
            { label: 'Objectif', width: 50, render: (o) => o.title },
            { label: 'Échéance', width: 18, right: true, render: (o) => formatDate(o.due_date) },
            { label: 'Avancement', width: 14, right: true, render: (o) => pct(o.progress) },
            { label: 'Statut', width: 18, render: (o) => OBJECTIVE_STATUS[o.status].label },
          ]}
        />

        <Text style={s.h2}>Entretiens tenus</Text>
        {report.held.length === 0 ? (
          <Text style={s.muted}>Aucun entretien tenu ce mois-ci.</Text>
        ) : (
          <PdfTable
            rows={report.held}
            columns={[
              { label: 'Date', width: 18, render: (r) => formatDate(r.scheduled_at) },
              { label: 'Collaborateur', width: 26, render: (r) => {
                const p = report.rows.find((x) => x.person.id === r.collaborator_id)?.person;
                return p ? fullName(p) : '—';
              } },
              { label: 'Type', width: 20, render: (r) => KIND_LABEL[r.kind] },
              { label: 'Synthèse', width: 36, render: (r) => r.summary || '—' },
            ]}
          />
        )}
        <Footer note="Connect Team · document interne, ne pas diffuser hors de l’entreprise" />
      </Page>
    </Document>
  );
}
