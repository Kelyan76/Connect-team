import { Document, Page, Text } from '@react-pdf/renderer';
import { FEEDBACK_KIND } from '@/features/feedback/queries';
import { formatKrValue, OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { KIND_LABEL, reviewStage } from '@/features/reviews/lib/review-rules';
import { effectiveLevel, LEVEL_LABEL } from '@/features/skills/lib/risk';
import type { Person } from '@/features/team/api';
import { formatDate, formatPercent, fullName } from '@/shared/lib/format';
import type { ReportData } from '../report-data';
import { pdfText } from '../report-data';
import { Footer, Header, PdfTable } from './parts';
import { s } from './styles';

/** Fiche collaborateur : identité, objectifs, compétences, entretiens, feedbacks partagés. */
export function PersonDocument({ person, data }: { person: Person; data: ReportData }) {
  const objectives = data.objectives.filter((o) => o.owner_id === person.id);
  const levels = data.levels.filter((l) => l.collaborator_id === person.id && effectiveLevel(l) > 0);
  const reviews = data.reviews.filter((r) => r.collaborator_id === person.id);
  const feedbacks = data.feedbacks.filter((f) => f.collaborator_id === person.id && f.is_shared);
  return (
    <Document title={`Fiche ${fullName(person)}`} author="Connect Team" language="fr">
      <Page size="A4" style={s.page}>
        <Header company={data.company} kind="Fiche collaborateur" />
        <Text style={s.title}>{fullName(person)}</Text>
        <Text style={s.subtitle}>
          {person.job_title} · arrivé le {person.hired_on ? formatDate(person.hired_on) : '—'} · {person.email}
        </Text>

        <Text style={s.h2}>Objectifs</Text>
        {objectives.length === 0 ? (
          <Text style={s.muted}>Aucun objectif individuel.</Text>
        ) : (
          <PdfTable
            rows={objectives.flatMap((o) => o.keyResults.map((k, i) => ({ o, k, first: i === 0 })))}
            columns={[
              { label: 'Objectif', width: 30, render: (r) => (r.first ? r.o.title : '') },
              { label: 'Résultat clé', width: 34, render: (r) => r.k.title },
              { label: 'Actuel / cible', width: 18, right: true, render: (r) => pdfText(`${formatKrValue(r.k.current_value, r.k.unit)} / ${formatKrValue(r.k.target_value, r.k.unit)}`) },
              { label: 'Statut', width: 18, render: (r) => (r.first ? `${OBJECTIVE_STATUS[r.o.status].label} · ${pdfText(formatPercent(r.o.progress))}` : '') },
            ]}
          />
        )}

        <Text style={s.h2}>Compétences</Text>
        <PdfTable
          rows={levels}
          columns={[
            { label: 'Compétence', width: 46, render: (l) => data.skills.find((x) => x.id === l.skill_id)?.name ?? '' },
            { label: 'Auto-évaluation', width: 18, right: true, render: (l) => String(l.self_level ?? '—') },
            { label: 'Niveau retenu', width: 36, render: (l) => `${effectiveLevel(l)} · ${LEVEL_LABEL[effectiveLevel(l)]}` },
          ]}
        />

        <Text style={s.h2}>Historique des entretiens</Text>
        <PdfTable
          rows={reviews}
          columns={[
            { label: 'Date', width: 18, render: (r) => formatDate(r.scheduled_at) },
            { label: 'Type', width: 22, render: (r) => KIND_LABEL[r.kind] },
            { label: 'Statut', width: 14, render: (r) => ({ preparation: 'Planifié', a_signer: 'À signer', signe: 'Signé', annule: 'Annulé' })[reviewStage(r)] },
            { label: 'Synthèse', width: 46, render: (r) => r.summary || '—' },
          ]}
        />

        <Text style={s.h2}>Feedbacks partagés</Text>
        {feedbacks.length === 0 ? (
          <Text style={s.muted}>Aucun feedback partagé.</Text>
        ) : (
          feedbacks.map((f) => (
            <Text key={f.id} style={s.para} wrap={false}>
              <Text style={s.subtle}>
                {formatDate(f.created_at)} · {FEEDBACK_KIND[f.kind]}
                {'\n'}
              </Text>
              {f.body}
            </Text>
          ))
        )}
        <Footer note="Les notes privées du manager ne figurent jamais dans cette fiche." />
      </Page>
    </Document>
  );
}
