import { ListChecks } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input, NativeSelect } from '@/shared/ui/input';
import { Checkbox } from '@/shared/ui/toggle';
import { summaryLines, type ActionDraft } from '../lib/echo';

interface Props {
  summary: string;
  drafts: ActionDraft[];
  names: { manager: string; collaborator: string };
  pending: boolean;
  onChange: (key: string, patch: Partial<ActionDraft>) => void;
  onAdd: () => void;
  onRestart: () => void;
}

/** Résultat d'Echo : résumé, puis tâches détectées que le manager relit avant de les ajouter au plan. */
export function EchoDrafts({ summary, drafts, names, pending, onChange, onAdd, onRestart }: Props) {
  const kept = drafts.filter((d) => d.keep && d.title.trim().length >= 3).length;
  const lines = summaryLines(summary);

  return (
    <div className="flex animate-page-in flex-col gap-4">
      {lines.length > 0 && (
        <div className="rounded border border-line bg-surface-muted px-4 py-3">
          <p className="mb-1 text-xs font-medium text-fg-subtle">Résumé d’Echo</p>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-fg-muted">
            {lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
      {drafts.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Echo n’a détecté aucun engagement. Récapitulez à voix haute qui fait quoi et pour quand,
          puis recommencez.
        </p>
      ) : (
        <ul className="stagger flex flex-col gap-3">
          {drafts.map((d) => (
            <li key={d.key} className="flex flex-col gap-2 rounded border border-line p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  aria-label={`Garder « ${d.title} »`}
                  checked={d.keep}
                  onCheckedChange={(v) => onChange(d.key, { keep: v === true })}
                />
                <Input
                  aria-label="Action"
                  className="min-w-0 flex-1"
                  value={d.title}
                  maxLength={200}
                  disabled={!d.keep}
                  onChange={(e) => onChange(d.key, { title: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2 pl-7">
                <NativeSelect
                  aria-label="Responsable"
                  className="w-40"
                  value={d.owner}
                  disabled={!d.keep}
                  onChange={(e) =>
                    onChange(d.key, { owner: e.target.value as ActionDraft['owner'] })
                  }
                >
                  <option value="collaborateur">{names.collaborator}</option>
                  <option value="manager">{names.manager} (vous)</option>
                </NativeSelect>
                <Input
                  aria-label="Échéance"
                  type="date"
                  className="w-40"
                  value={d.due}
                  disabled={!d.keep}
                  onChange={(e) => onChange(d.key, { due: e.target.value })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {drafts.length > 0 && (
          <Button variant="primary" disabled={kept === 0 || pending} onClick={onAdd}>
            <ListChecks aria-hidden />
            {kept > 1 ? `Ajouter ${kept} actions au plan` : 'Ajouter au plan'}
          </Button>
        )}
        <Button variant="ghost" onClick={onRestart}>
          Recommencer
        </Button>
      </div>
    </div>
  );
}
