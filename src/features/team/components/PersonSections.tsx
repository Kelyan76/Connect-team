import { useNavigate } from 'react-router-dom';
import { FEEDBACK_KIND, useFeedbacks } from '@/features/feedback/queries';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import { useObjectives } from '@/features/objectives/queries';
import { KIND_LABEL, reviewStage } from '@/features/reviews/lib/review-rules';
import { useReviews } from '@/features/reviews/queries';
import { effectiveLevel, LEVEL_LABEL } from '@/features/skills/lib/risk';
import { useSkillLevels, useSkills } from '@/features/skills/queries';
import { formatDate, formatPercent } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { ProgressBar } from '@/shared/ui/data';
import { EmptyState, TableSkeleton } from '@/shared/ui/feedback';
import { Panel } from '@/shared/ui/layout';
import { Table, TBody, Td, Th, THead, Tr } from '@/shared/ui/table';

const STAGE_LABEL = { preparation: 'Planifié', a_signer: 'À signer', signe: 'Signé', annule: 'Annulé' } as const;

export function PersonObjectives({ personId }: { personId: string }) {
  const objectives = useObjectives();
  const mine = objectives.data?.filter((o) => o.owner_id === personId);
  return (
    <Panel flush>
      {!mine ? (
        <TableSkeleton rows={3} columns={3} />
      ) : mine.length === 0 ? (
        <EmptyState title="Aucun objectif individuel" description="Fixez un objectif depuis la page Objectifs." />
      ) : (
        <ul className="divide-y divide-line">
          {mine.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-medium">{o.title}</span>
                <Badge tone={OBJECTIVE_STATUS[o.status].tone}>{OBJECTIVE_STATUS[o.status].label}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar value={o.progress} tone={OBJECTIVE_STATUS[o.status].tone} label="Avancement" />
                <span className="tabular w-10 text-right text-sm">{formatPercent(o.progress)}</span>
              </div>
              <span className="text-xs text-fg-subtle">Échéance le {formatDate(o.due_date)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function PersonSkills({ personId }: { personId: string }) {
  const skills = useSkills();
  const levels = useSkillLevels();
  const rows = (skills.data ?? [])
    .map((s) => ({ skill: s, level: levels.data?.find((l) => l.skill_id === s.id && l.collaborator_id === personId) }))
    .filter((r) => r.level);
  return (
    <Panel flush>
      {!skills.data || !levels.data ? (
        <TableSkeleton rows={4} columns={3} />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>Compétence</Th>
              <Th>Domaine</Th>
              <Th align="right">Auto-évaluation</Th>
              <Th>Niveau retenu</Th>
            </tr>
          </THead>
          <TBody>
            {rows.map(({ skill, level }) => (
              <Tr key={skill.id}>
                <Td className="font-medium">{skill.name}</Td>
                <Td className="text-fg-muted">{skill.category}</Td>
                <Td numeric>{level?.self_level ?? '—'}</Td>
                <Td>
                  {effectiveLevel(level) ? `${effectiveLevel(level)} · ${LEVEL_LABEL[effectiveLevel(level)]}` : '—'}
                  {level && !level.validated_at && (
                    <Badge tone="warning" className="ml-2">
                      À valider
                    </Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}

export function PersonReviews({ personId }: { personId: string }) {
  const navigate = useNavigate();
  const reviews = useReviews();
  const mine = reviews.data?.filter((r) => r.collaborator_id === personId);
  return (
    <Panel flush>
      {!mine ? (
        <TableSkeleton rows={4} columns={3} />
      ) : mine.length === 0 ? (
        <EmptyState title="Aucun entretien" description="L’historique des entretiens apparaîtra ici." />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th align="right">Date</Th>
              <Th>Type</Th>
              <Th>Statut</Th>
              <Th>Synthèse</Th>
            </tr>
          </THead>
          <TBody>
            {mine.map((r) => (
              <Tr key={r.id} className="cursor-pointer" onClick={() => navigate(`/entretiens/${r.id}`)}>
                <Td numeric>{formatDate(r.scheduled_at)}</Td>
                <Td className="whitespace-nowrap">{KIND_LABEL[r.kind]}</Td>
                <Td>
                  <Badge tone={reviewStage(r) === 'signe' ? 'success' : reviewStage(r) === 'a_signer' ? 'warning' : 'neutral'}>
                    {STAGE_LABEL[reviewStage(r)]}
                  </Badge>
                </Td>
                <Td className="max-w-90 truncate text-fg-muted">{r.summary || '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Panel>
  );
}

export function PersonFeedbacks({ personId }: { personId: string }) {
  const feedbacks = useFeedbacks();
  const mine = feedbacks.data?.filter((f) => f.collaborator_id === personId);
  return (
    <Panel flush>
      {!mine ? (
        <TableSkeleton rows={3} columns={2} />
      ) : mine.length === 0 ? (
        <EmptyState title="Aucun feedback" description="Les feedbacks alimentent automatiquement la préparation des entretiens." />
      ) : (
        <ul className="divide-y divide-line">
          {mine.map((f) => (
            <li key={f.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={f.kind === 'axe_progres' ? 'warning' : f.kind === 'reconnaissance' ? 'success' : 'accent'}>{FEEDBACK_KIND[f.kind]}</Badge>
                <span className="text-xs text-fg-subtle">{formatDate(f.created_at)}</span>
                <span className="text-xs text-fg-subtle">· {f.is_shared ? 'Partagé' : 'Privé'}</span>
              </div>
              <p className="text-base">{f.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
