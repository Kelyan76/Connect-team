import { Plus, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { EmptyState } from '@/shared/ui/feedback';
import { Field } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { toUserMessage } from '@/shared/lib/errors';
import { useTeamMembers } from '../queries';
import { useCreateSquad, useDeleteSquad, useSquads, type Squad } from '../squads';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';

/** Équipes au sein de l'équipe : création et suppression (les membres restent dans l'équipe du manager). */
export function SquadsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const squads = useSquads();
  const team = useTeamMembers();
  const create = useCreateSquad();
  const remove = useDeleteSquad();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Squad | null>(null);

  const add = async () => {
    const n = name.trim();
    if (n.length < 2) return setError('2 caractères minimum.');
    if ((squads.data ?? []).some((s) => s.name.toLowerCase() === n.toLowerCase()))
      return setError('Cette équipe existe déjà.');
    setError(null);
    try {
      await create.mutateAsync(n);
      setName('');
    } catch (e) {
      setError(toUserMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Équipes"
        description="Regroupez vos collaborateurs (Back-end, Mobile, Qualité…) pour leur fixer des objectifs communs."
        footer={<Button onClick={() => onOpenChange(false)}>Fermer</Button>}
      >
        <div className="flex flex-col gap-4">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <Field label="Nouvelle équipe" error={error ?? undefined} className="flex-1">
              <Input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. : Back-end"
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={create.isPending}
              className={error ? 'mb-6' : undefined}
            >
              <Plus aria-hidden />
              Ajouter
            </Button>
          </form>
          {!squads.data?.length ? (
            <EmptyState
              icon={<Users className="size-5" aria-hidden />}
              title="Aucune équipe"
              description="Créez votre première équipe ci-dessus."
              className="p-0"
            />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {squads.data.map((s) => {
                const members = team.active.filter((p) => p.squad_id === s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-base font-medium">{s.name}</span>
                      <span className="truncate text-xs text-fg-subtle">
                        {members.length
                          ? members.map((p) => p.first_name).join(', ')
                          : 'Personne pour l’instant : attribuez l’équipe depuis une fiche.'}
                      </span>
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Supprimer l’équipe ${s.name}`}
                      disabled={remove.isPending}
                      onClick={() => setToDelete(s)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Supprimer l’équipe « ${toDelete?.name ?? ''} » ?`}
        description="Ses membres restent dans votre équipe ; ses objectifs deviennent des objectifs de toute l’équipe."
        confirmLabel="Supprimer"
        pending={remove.isPending}
        onConfirm={() =>
          toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
        }
      />
    </Dialog>
  );
}
