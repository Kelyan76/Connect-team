import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { OBJECTIVE_STATUS } from '@/features/objectives/lib/status';
import type { ObjectiveView } from '@/features/objectives/queries';
import { KIND_LABEL, PREP_META, prepStatus } from '@/features/reviews/lib/review-rules';
import type { Review } from '@/features/reviews/api';
import { PRIORITY, type Task } from '@/features/tasks/queries';
import type { Person } from '@/features/team/api';
import { daysFromToday } from '@/shared/lib/dates';
import { formatDate, formatPercent, fullName, relativeDays } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge, StatusDot } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ProgressBar } from '@/shared/ui/data';
import { Dialog, DialogContent } from '@/shared/ui/dialog';

export type KpiKind = 'objectifs' | 'charge' | 'retard' | 'entretiens';

interface Props {
  kind: KpiKind | null;
  onClose: () => void;
  byId: Map<string, Person>;
  objectives: ObjectiveView[];
  loadByPerson: { person: Person; load: number | null }[];
  late: Task[];
  toPrepare: Review[];
}

const META: Record<KpiKind, { title: string; description: string; to: string; cta: string }> = {
  objectifs: { title: 'Objectifs', description: 'Du moins avancé au plus avancé.', to: '/objectifs', cta: 'Ouvrir les objectifs' },
  charge: { title: 'Charge cette semaine', description: 'Par collaborateur, en % de sa capacité.', to: '/plan-de-charge', cta: 'Ouvrir le plan de charge' },
  retard: { title: 'Tâches en retard', description: 'Échéance dépassée, non terminées.', to: '/taches', cta: 'Ouvrir le planning' },
  entretiens: { title: 'Entretiens à préparer', description: 'Dans les 15 prochains jours.', to: '/entretiens', cta: 'Ouvrir les entretiens' },
};

function Row({ to, children }: { to?: string; children: ReactNode }) {
  const body = <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>;
  return (
    <li>
      {to ? (
        <Link to={to} className="-mx-2 flex items-center gap-2 rounded px-2 py-3 hover:bg-surface-muted">
          {body}
          <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        </Link>
      ) : (
        <div className="flex items-center gap-2 py-3">{body}</div>
      )}
    </li>
  );
}

/** Détail d'une carte chiffre de l'accueil : la liste qui explique le chiffre, puis un lien vers la page complète. */
export function KpiDetailDialog({ kind, onClose, byId, objectives, loadByPerson, late, toPrepare }: Props) {
  const meta = kind ? META[kind] : null;
  return (
    <Dialog open={kind !== null} onOpenChange={(o) => !o && onClose()}>
      {meta && (
        <DialogContent
          title={meta.title}
          description={meta.description}
          footer={
            <Button asChild variant="primary" className="w-full sm:w-auto" onClick={onClose}>
              <Link to={meta.to}>{meta.cta}</Link>
            </Button>
          }
        >
          <ul className="stagger divide-y divide-line">
            {kind === 'objectifs' &&
              objectives.map((o) => {
                const status = OBJECTIVE_STATUS[o.status];
                const owner = o.owner_id ? byId.get(o.owner_id) : undefined;
                return (
                  <Row key={o.id}>
                    <span className="flex min-w-0 flex-1 flex-col gap-2">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 text-base font-medium">{o.title}</span>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </span>
                      <span className="flex items-center gap-3">
                        <ProgressBar value={o.progress} tone={status.tone} label={`Avancement de ${o.title}`} />
                        <span className="tabular w-10 shrink-0 text-right text-sm font-medium">{formatPercent(o.progress)}</span>
                      </span>
                      <span className="text-xs text-fg-subtle">{owner ? fullName(owner) : 'Objectif d’équipe'}</span>
                    </span>
                  </Row>
                );
              })}

            {kind === 'charge' &&
              loadByPerson.map(({ person, load }) => {
                const over = load !== null && load > 100;
                return (
                  <Row key={person.id} to={`/equipe/${person.id}`}>
                    <Avatar person={person} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-base font-medium">{fullName(person)}</span>
                        <span className={over ? 'tabular text-sm font-semibold text-danger' : 'tabular text-sm font-medium'}>
                          {load === null ? '—' : formatPercent(load, false)}
                        </span>
                      </span>
                      <ProgressBar value={(load ?? 0) / 100} tone={over ? 'danger' : load !== null && load < 60 ? 'warning' : 'success'} label={`Charge de ${fullName(person)}`} />
                    </span>
                  </Row>
                );
              })}

            {kind === 'retard' &&
              (late.length === 0 ? (
                <p className="py-6 text-center text-sm text-fg-subtle">Aucune tâche en retard.</p>
              ) : (
                late.map((t) => {
                  const who = t.assignee_id ? byId.get(t.assignee_id) : undefined;
                  return (
                    <Row key={t.id}>
                      {who && <Avatar person={who} size="sm" />}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-base font-medium">{t.title}</span>
                        <span className="text-sm text-danger">
                          Prévue le {formatDate(t.due_date ?? '')}
                          {who ? <span className="text-fg-subtle"> · {fullName(who)}</span> : null}
                        </span>
                      </span>
                      {(t.priority === 'urgente' || t.priority === 'haute') && (
                        <Badge tone={t.priority === 'urgente' ? 'danger' : 'warning'}>{PRIORITY[t.priority].label}</Badge>
                      )}
                    </Row>
                  );
                })
              ))}

            {kind === 'entretiens' &&
              (toPrepare.length === 0 ? (
                <p className="py-6 text-center text-sm text-fg-subtle">Tous les entretiens sont prêts.</p>
              ) : (
                toPrepare.map((r) => {
                  const who = byId.get(r.collaborator_id);
                  const prep = PREP_META[prepStatus(r)];
                  return (
                    <Row key={r.id} to={`/entretiens/${r.id}`}>
                      {who && <Avatar person={who} />}
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="truncate text-base font-medium">{who ? fullName(who) : '—'}</span>
                        <span className="text-sm text-fg-subtle">
                          {KIND_LABEL[r.kind]} · {relativeDays(daysFromToday(r.scheduled_at.slice(0, 10)))}
                        </span>
                        <StatusDot tone={prep.tone}>{prep.label}</StatusDot>
                      </span>
                    </Row>
                  );
                })
              ))}
          </ul>
        </DialogContent>
      )}
    </Dialog>
  );
}
