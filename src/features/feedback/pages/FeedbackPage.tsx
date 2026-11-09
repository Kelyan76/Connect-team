import { Eye, EyeOff, PenLine, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import { useTeamMembers } from '@/features/team/queries';
import { useHotkey } from '@/shared/hooks/use-hotkeys';
import { formatDate, fullName } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/shared/ui/feedback';
import { NativeSelect } from '@/shared/ui/input';
import { Page, PageHeader, Toolbar } from '@/shared/ui/layout';
import { Tooltip } from '@/shared/ui/menu';
import { FeedbackDialog } from '../components/FeedbackDialog';
import { DESC_STEPS, FEEDBACK_TYPES, type CourseFeedbackKind } from '../lib/desc';
import { FEEDBACK_KIND, useDeleteFeedback, useFeedbacks, useToggleShare, type FeedbackKind } from '../queries';

const TONE: Record<FeedbackKind, 'accent' | 'warning' | 'success' | 'danger'> = {
  reconnaissance: 'success',
  point_fort: 'success',
  amelioration: 'warning',
  axe_progres: 'warning',
  recadrage: 'danger',
};
/** Les anciens types sont regroupés avec leur équivalent du cours pour le filtre. */
const FAMILY: Record<FeedbackKind, CourseFeedbackKind> = { reconnaissance: 'reconnaissance', point_fort: 'reconnaissance', amelioration: 'amelioration', axe_progres: 'amelioration', recadrage: 'recadrage' };

export default function FeedbackPage() {
  const { isManager } = useCurrentUser();
  const feedbacks = useFeedbacks();
  const team = useTeamMembers();
  const share = useToggleShare();
  const remove = useDeleteFeedback();
  const [params, setParams] = useSearchParams();
  const [writing, setWriting] = useState(false);
  const [person, setPerson] = useState('');
  const [preset, setPreset] = useState<{ person?: string; kind?: CourseFeedbackKind }>({});
  const [kind, setKind] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  useHotkey('n', () => isManager && setWriting(true));

  // Ouverture directe depuis un lien (fiche collaborateur, leviers DREAM, aide à la décision).
  useEffect(() => {
    if (!isManager || params.get('nouveau') !== '1') return;
    const type = params.get('type');
    setPreset({ person: params.get('collaborateur') ?? undefined, kind: type && type in FEEDBACK_TYPES ? (type as CourseFeedbackKind) : undefined });
    setWriting(true);
    setParams({}, { replace: true });
  }, [isManager, params, setParams]);

  const list = (feedbacks.data ?? []).filter((f) => (!person || f.collaborator_id === person) && (!kind || FAMILY[f.kind] === kind));

  return (
    <Page>
      <PageHeader
        breadcrumbs={[{ label: isManager ? 'Équipe' : 'Mon espace' }, { label: 'Feedbacks' }]}
        title={isManager ? 'Feedback continu' : 'Mes feedbacks'}
        description={
          isManager
            ? 'Reconnaissance, amélioration ou recadrage, préparés avec la méthode DESC. Choisissez ce qui est partagé : tout alimente la préparation des 1 à 1.'
            : 'Les feedbacks que votre manager a choisi de partager avec vous.'
        }
        actions={
          isManager && (
            <Button variant="primary" onClick={() => setWriting(true)}>
              <PenLine aria-hidden />
              Préparer un feedback
            </Button>
          )
        }
      />
      <Toolbar>
        {isManager && (
          <NativeSelect aria-label="Filtrer par collaborateur" className="w-56" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Tous les collaborateurs</option>
            {team.active.map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect aria-label="Filtrer par type" className="w-48" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Tous les types</option>
          {(Object.keys(FEEDBACK_TYPES) as CourseFeedbackKind[]).map((k) => (
            <option key={k} value={k}>
              {FEEDBACK_TYPES[k].label}
            </option>
          ))}
        </NativeSelect>
      </Toolbar>
      <div className="rounded-lg border border-line bg-surface">
        {feedbacks.error ? (
          <ErrorState error={feedbacks.error} onRetry={() => void feedbacks.refetch()} />
        ) : !feedbacks.data ? (
          <TableSkeleton rows={5} columns={3} />
        ) : list.length === 0 ? (
          <EmptyState
            title="Aucun feedback"
            description={isManager ? 'Un feedback précis et daté vaut mieux qu’un long bilan annuel.' : 'Votre manager n’a pas encore partagé de feedback avec vous.'}
            action={isManager ? <Button onClick={() => setWriting(true)}>Rédiger un feedback</Button> : undefined}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((f) => {
              const p = team.byId.get(f.collaborator_id);
              return (
                <li key={f.id} className="flex gap-4 px-4 py-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      {isManager && p && <PersonLabel person={p} size="xs" />}
                      <Badge tone={TONE[f.kind]}>{FEEDBACK_KIND[f.kind]}</Badge>
                      <span className="text-xs text-fg-subtle">{formatDate(f.created_at)}</span>
                      {isManager && <span className="text-xs text-fg-subtle">{f.is_shared ? 'Partagé' : 'Privé'}</span>}
                    </div>
                    {f.desc_d ? (
                      <dl className="flex max-w-prose flex-col gap-1">
                        {(['d', 'e', 's', 'c'] as const)
                          .filter((s) => f[`desc_${s}`])
                          .map((s) => (
                            <div key={s} className="flex gap-2 text-base">
                              <dt className="w-5 shrink-0 font-semibold text-sec-reviews" title={DESC_STEPS[s].label}>
                                {DESC_STEPS[s].letter}
                              </dt>
                              <dd>{f[`desc_${s}`]}</dd>
                            </div>
                          ))}
                      </dl>
                    ) : (
                      <p className="max-w-prose text-base">{f.body}</p>
                    )}
                  </div>
                  {isManager && (
                    <div className="flex shrink-0 items-start gap-1">
                      <Tooltip content={f.is_shared ? 'Rendre privé' : 'Partager avec le collaborateur'}>
                        <Button size="icon-sm" variant="ghost" aria-label={f.is_shared ? 'Rendre privé' : 'Partager'} onClick={() => share.mutate({ id: f.id, shared: !f.is_shared })}>
                          {f.is_shared ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
                        </Button>
                      </Tooltip>
                      <Button size="icon-sm" variant="ghost" aria-label="Supprimer" onClick={() => setToDelete(f.id)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {isManager && <FeedbackDialog
          open={writing}
          onOpenChange={(o) => {
            setWriting(o);
            if (!o) setPreset({});
          }}
          defaultPerson={preset.person ?? person}
          defaultKind={preset.kind}
        />}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer ce feedback ?"
        description="Il disparaîtra aussi de la préparation des prochains entretiens."
        confirmLabel="Supprimer"
        onConfirm={() => toDelete && remove.mutate(toDelete, { onSettled: () => setToDelete(null) })}
      />
    </Page>
  );
}
