import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Input, NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { useDiscProfiles, useSaveDisc } from '../disc-queries';
import { DISC, DISC_SOURCE, DISC_STYLES, type DiscStyle } from '../lib/disc';

/**
 * Profil DISC d'une personne : modifiable par elle-même (auto-évaluation) ou par son manager (établi ensemble).
 * Sert uniquement à adapter la forme de la communication.
 */
export function DiscCard({ personId, self }: { personId: string; self: boolean }) {
  const discs = useDiscProfiles();
  const save = useSaveDisc();
  const current = discs.data?.find((d) => d.collaborator_id === personId);
  const [editing, setEditing] = useState(false);
  const [primary, setPrimary] = useState<DiscStyle>('S');
  const [secondary, setSecondary] = useState<DiscStyle | ''>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setPrimary((current?.primary_style as DiscStyle | undefined) ?? 'S');
    setSecondary((current?.secondary_style as DiscStyle | null | undefined) ?? '');
    setNote(current?.note ?? '');
  }, [current]);

  const style = current ? DISC[current.primary_style as DiscStyle] : null;
  const submit = () =>
    save.mutate(
      { collaborator_id: personId, primary_style: primary, secondary_style: secondary || null, source: self ? 'auto_evaluation' : 'echange', note: note.trim() },
      { onSuccess: () => setEditing(false) },
    );

  return (
    <Panel
      title={self ? 'Mon style de communication (DISC)' : 'Profil DISC'}
      description={self ? 'Il aide votre manager à adapter la forme de ses échanges avec vous. Vous pouvez le corriger à tout moment.' : 'Établi avec le collaborateur, visible par lui : on adapte la forme, jamais le fond.'}
      actions={
        !editing && (
          <Button size="sm" onClick={() => setEditing(true)}>
            {current ? 'Modifier' : 'Renseigner'}
          </Button>
        )
      }
    >
      {editing ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DISC_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={primary === s}
                onClick={() => {
                  setPrimary(s);
                  if (secondary === s) setSecondary('');
                }}
                className={cn('flex flex-col gap-1 rounded-lg border p-3 text-left', primary === s ? 'border-accent bg-accent-subtle' : 'border-line hover:bg-surface-muted')}
              >
                <span className={cn('text-lg font-semibold', DISC[s].tone)}>{s}</span>
                <span className="text-sm font-medium">{DISC[s].name}</span>
                <span className="text-xs text-fg-subtle">{DISC[s].traits}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Style secondaire" optional>
              <NativeSelect value={secondary} onChange={(e) => setSecondary(e.target.value as DiscStyle | '')}>
                <option value="">Aucun</option>
                {DISC_STYLES.filter((s) => s !== primary).map((s) => (
                  <option key={s} value={s}>
                    {s} · {DISC[s].name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Remarque" optional>
              <Input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : préfère être prévenue à l’avance" />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" disabled={save.isPending} onClick={submit}>
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : current && style ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className={cn('flex size-12 items-center justify-center rounded-full text-lg font-semibold', style.soft)}>
              {current.primary_style}
              {current.secondary_style ?? ''}
            </span>
            <span className="flex flex-col">
              <span className="text-base font-medium">
                {style.name}
                {current.secondary_style && `, ${DISC[current.secondary_style as DiscStyle].name.toLowerCase()}`}
              </span>
              <span className="text-xs text-fg-subtle">
                {DISC_SOURCE[current.source as 'auto_evaluation' | 'echange']} · {formatDate(current.updated_at)}
              </span>
            </span>
          </div>
          {current.note && <p className="text-sm text-fg-muted">{current.note}</p>}
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-success">À faire</dt>
              <dd className="text-sm">{style.do}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-danger">À éviter</dt>
              <dd className="text-sm">{style.avoid}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium text-fg-subtle">En 1 à 1</dt>
              <dd className="text-sm">{style.oneToOne}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">{self ? 'Vous n’avez pas encore indiqué votre style.' : 'Pas encore renseigné : faites-le avec lui lors d’un prochain 1 à 1.'}</p>
      )}
    </Panel>
  );
}
