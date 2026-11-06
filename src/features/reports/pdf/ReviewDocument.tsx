import { Document, Page, Text, View } from '@react-pdf/renderer';
import { reviewQuestions, type Answer, type Review, type ReviewAction } from '@/features/reviews/api';
import { formatAnswer } from '@/features/reviews/lib/format-answer';
import { hasGap, KIND_LABEL, type AnswerValue } from '@/features/reviews/lib/review-rules';
import type { Person } from '@/features/team/api';
import { formatDate, formatDateTime, formatTime, fullName } from '@/shared/lib/format';
import { pdfText } from '../report-data';
import { Footer, Header, PdfTable } from './parts';
import { C, s } from './styles';

interface Props {
  review: Review;
  answers: Answer[];
  actions: ReviewAction[];
  person: Person;
  manager: Person | undefined;
  company: string;
}

/** Compte-rendu d'entretien signé : réponses côte à côte, synthèse, plan d'action, signatures horodatées. */
export function ReviewDocument({ review, answers, actions, person, manager, company }: Props) {
  const questions = reviewQuestions(review);
  const get = (key: string, author: 'manager' | 'collaborateur') => answers.find((a) => a.question_key === key && a.author === author)?.value as AnswerValue | undefined;
  const byId = (id: string) => (id === person.id ? fullName(person) : manager ? fullName(manager) : '');
  return (
    <Document title={`Compte-rendu ${KIND_LABEL[review.kind]} ${fullName(person)}`} author="Connect Team" language="fr">
      <Page size="A4" style={s.page}>
        <Header company={company} kind="Compte-rendu d’entretien" />
        <Text style={s.title}>
          {KIND_LABEL[review.kind]} · {fullName(person)}
        </Text>
        <Text style={s.subtitle}>
          {person.job_title} · {formatDate(review.scheduled_at)} à {formatTime(review.scheduled_at)}
          {review.location ? ` · ${review.location}` : ''}
          {manager ? ` · mené par ${fullName(manager)}` : ''}
        </Text>

        <Text style={s.h2}>Réponses</Text>
        {questions.map((q) => {
          const collab = get(q.key, 'collaborateur');
          const mgr = get(q.key, 'manager');
          return (
            <View key={q.key} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={s.h3}>
                {q.label}
                {hasGap(q.type, collab, mgr) ? '  — écart d’appréciation' : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Text style={{ flex: 1 }}>
                  <Text style={s.subtle}>Collaborateur : </Text>
                  {formatAnswer(q.type, collab)}
                </Text>
                <Text style={{ flex: 1 }}>
                  <Text style={s.subtle}>Manager : </Text>
                  {formatAnswer(q.type, mgr)}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={s.h2}>Notes et synthèse</Text>
        {review.live_notes ? <Text style={s.para}>{review.live_notes}</Text> : null}
        <Text style={s.para}>{review.summary || 'Pas de synthèse rédigée.'}</Text>

        <Text style={s.h2}>Plan d’action</Text>
        {actions.length === 0 ? (
          <Text style={s.muted}>Aucune action.</Text>
        ) : (
          <PdfTable
            rows={actions}
            columns={[
              { label: 'Action', width: 56, render: (a) => a.title },
              { label: 'Responsable', width: 24, render: (a) => byId(a.owner_id) },
              { label: 'Échéance', width: 20, right: true, render: (a) => (a.due_date ? formatDate(a.due_date) : '—') },
            ]}
          />
        )}

        <Text style={s.h2}>Signatures</Text>
        <View style={{ flexDirection: 'row', gap: 12 }} wrap={false}>
          {[
            { label: `Collaborateur · ${fullName(person)}`, at: review.collaborator_signed_at },
            { label: `Manager · ${manager ? fullName(manager) : ''}`, at: review.manager_signed_at },
          ].map((b) => (
            <View key={b.label} style={s.signBox}>
              <Text style={s.subtle}>{b.label}</Text>
              <Text style={{ marginTop: 4, color: b.at ? C.success : C.muted }}>
                {b.at ? pdfText(`Signé électroniquement le ${formatDateTime(b.at)}`) : 'En attente de signature'}
              </Text>
            </View>
          ))}
        </View>
        <Footer note={`Signature électronique simple horodatée par le serveur · Réf. ${review.id.slice(0, 8)}`} />
      </Page>
    </Document>
  );
}
