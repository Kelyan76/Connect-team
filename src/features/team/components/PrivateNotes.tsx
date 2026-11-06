import { Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { EmptyState, Skeleton } from '@/shared/ui/feedback';
import { Textarea } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { useAddNote, useDeleteNote, useNotes } from '../queries';

/** Notes privées : protégées par la RLS, jamais lisibles par le collaborateur. */
export function PrivateNotes({ personId, authorId }: { personId: string; authorId: string }) {
  const notes = useNotes(personId, true);
  const add = useAddNote(personId, authorId);
  const remove = useDeleteNote(personId);
  const [draft, setDraft] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  return (
    <Panel
      title="Notes privées"
      description="Visibles uniquement par vous. Le collaborateur n’y a jamais accès."
      actions={<Lock className="size-4 text-fg-subtle" aria-hidden />}
      flush
    >
      <form
        className="flex flex-col gap-2 border-b border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) add.mutate(draft.trim(), { onSuccess: () => setDraft('') });
        }}
      >
        <label htmlFor="new-note" className="sr-only">
          Nouvelle note
        </label>
        <Textarea id="new-note" rows={3} value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} placeholder="Contexte, point de vigilance, idée d’évolution…" />
        <Button type="submit" size="sm" variant="primary" className="self-end" disabled={!draft.trim() || add.isPending}>
          Ajouter la note
        </Button>
      </form>
      {!notes.data ? (
        <Skeleton className="m-4 h-16" />
      ) : notes.data.length === 0 ? (
        <EmptyState title="Aucune note" description="Consignez ici ce qui vous aidera à préparer vos prochains échanges." />
      ) : (
        <ul className="divide-y divide-line">
          {notes.data.map((n) => (
            <li key={n.id} className="group flex gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="whitespace-pre-line text-base">{n.body}</p>
                <span className="text-xs text-fg-subtle">{formatDateTime(n.created_at)}</span>
              </div>
              <Button size="icon-sm" variant="ghost" aria-label="Supprimer la note" onClick={() => setToDelete(n.id)}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette note ?"
        description="La note sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={() => toDelete && remove.mutate(toDelete, { onSettled: () => setToDelete(null) })}
      />
    </Panel>
  );
}
