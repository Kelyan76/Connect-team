import { Archive, Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '@/features/auth/AuthProvider';
import type { Person } from '@/features/team/api';
import { cn } from '@/shared/lib/cn';
import { formatDate, formatPercent, fullName } from '@/shared/lib/format';
import { Avatar } from '@/shared/ui/avatar';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ProgressBar } from '@/shared/ui/data';
import { Input } from '@/shared/ui/input';
import type { KeyResult } from '../api';
import { formatKrValue, keyResultProgress, OBJECTIVE_STATUS } from '../lib/status';
import { useArchiveObjective, useProposeValue, useReviewValue, type ObjectiveView } from '../queries';

function KeyResultRow({ kr, canUpdate, isManager }: { kr: KeyResult; canUpdate: boolean; isManager: boolean }) {
  const propose = useProposeValue(isManager);
  const review = useReviewValue();
  const [draft, setDraft] = useState<string | null>(null);
  const progress = keyResultProgress(kr);
  const submit = () => {
    const value = Number(String(draft).replace(',', '.'));
    if (draft === null || Number.isNaN(value)) return;
    propose.mutate({ id: kr.id, value }, { onSuccess: () => setDraft(null) });
  };

  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_200px_220px] md:items-center">
      <div className="flex min-w-0 flex-col">
        <span className="text-base">{kr.title}</span>
        <span className="tabular text-xs text-fg-subtle">
          Départ {formatKrValue(kr.start_value, kr.unit)} · cible {formatKrValue(kr.target_value, kr.unit)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={progress} label={`Avancement de ${kr.title}`} />
        <span className="tabular w-10 shrink-0 text-right text-sm">{formatPercent(progress)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {kr.pending_value !== null ? (
          <>
            <span className="tabular text-sm text-warning">
              {formatKrValue(kr.current_value, kr.unit)} → {formatKrValue(kr.pending_value, kr.unit)}
            </span>
            {isManager ? (
              <>
                <Button size="icon-sm" aria-label="Valider la mise à jour" onClick={() => review.mutate({ id: kr.id, accept: true })}>
                  <Check aria-hidden />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Refuser la mise à jour" onClick={() => review.mutate({ id: kr.id, accept: false })}>
                  <X aria-hidden />
                </Button>
              </>
            ) : (
              <Badge tone="warning">À valider</Badge>
            )}
          </>
        ) : draft !== null ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input aria-label={`Nouvelle valeur pour ${kr.title}`} autoFocus inputMode="decimal" className="tabular w-24 text-right" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button size="sm" type="submit" variant="primary" disabled={propose.isPending}>
              OK
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </form>
        ) : (
          <>
            <span className="tabular text-sm font-medium">{formatKrValue(kr.current_value, kr.unit)}</span>
            {canUpdate && (
              <Button size="sm" onClick={() => setDraft(String(kr.current_value).replace('.', ','))}>
                Mettre à jour
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/**
 * Objectif replié par défaut : titre, statut, responsable et avancement tiennent sur une carte courte.
 * Un toucher déplie la description et les résultats clés (mise à jour, validation, archivage).
 */
export function ObjectiveCard({ objective: o, owner }: { objective: ObjectiveView; owner?: Person }) {
  const { profile, isManager } = useCurrentUser();
  const archive = useArchiveObjective();
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState(false);
  const meta = OBJECTIVE_STATUS[o.status];
  const canUpdate = isManager || (o.scope === 'individuel' && o.owner_id === profile.id);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-muted/50"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-md font-semibold">{o.title}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-subtle">
              {owner ? (
                <span className="flex items-center gap-2">
                  <Avatar person={owner} size="xs" />
                  {fullName(owner)}
                </span>
              ) : (
                <span>Objectif d’équipe</span>
              )}
              <span aria-hidden>·</span>
              <span>{formatDate(o.due_date)}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <ChevronDown className={cn('size-4 text-fg-subtle transition-transform', open && 'rotate-180')} aria-hidden />
          </span>
        </span>
        <span className="flex items-center gap-3">
          <ProgressBar value={o.progress} tone={meta.tone} label="Avancement global" />
          <span className="tabular w-10 shrink-0 text-right text-sm font-semibold">{formatPercent(o.progress)}</span>
        </span>
        {o.pending > 0 && isManager && (
          <span>
            <Badge tone="warning">{o.pending} mise{o.pending > 1 ? 's' : ''} à jour à valider</Badge>
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-line">
          {(o.description || isManager) && (
            <div className="flex items-start justify-between gap-3 px-5 pt-4">
              <div className="flex min-w-0 flex-col gap-1">
                {o.description && <p className="max-w-prose text-sm text-fg-muted">{o.description}</p>}
                <span className="text-xs text-fg-subtle">
                  {o.scope === 'equipe' ? 'Objectif d’équipe' : 'Objectif individuel'} · du {formatDate(o.start_date)} au{' '}
                  {formatDate(o.due_date)}
                </span>
              </div>
              {isManager && (
                <Button size="icon-sm" variant="ghost" aria-label="Archiver l’objectif" onClick={() => setConfirm(true)}>
                  <Archive aria-hidden />
                </Button>
              )}
            </div>
          )}
          <p className="px-5 pt-4 text-xs font-medium uppercase tracking-wide text-fg-subtle">Résultats clés</p>
          <ul className="divide-y divide-line">
            {o.keyResults.map((kr) => (
              <KeyResultRow key={kr.id} kr={kr} canUpdate={canUpdate} isManager={isManager} />
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Archiver cet objectif ?"
        description={`« ${o.title} » n’apparaîtra plus dans les listes ni dans les alertes. Son historique est conservé.`}
        confirmLabel="Archiver"
        onConfirm={() => archive.mutate(o.id, { onSettled: () => setConfirm(false) })}
      />
    </article>
  );
}
