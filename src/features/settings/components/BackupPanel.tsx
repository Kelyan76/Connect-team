import { FileJson, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { EXPORT_TABLES, exportCsv, exportJson, type ExportTable } from '@/features/export/export';
import { toUserMessage } from '@/shared/lib/errors';
import { pluralize } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { NativeSelect } from '@/shared/ui/input';
import { Panel } from '@/shared/ui/layout';
import { toast } from '@/shared/ui/toaster';

/** Sauvegarde des données : JSON complet ou CSV par table (séparateur « ; », lisible dans Excel). */
export function BackupPanel() {
  const [table, setTable] = useState<ExportTable>('profiles');
  const [busy, setBusy] = useState(false);
  const run = async (task: () => Promise<number>) => {
    setBusy(true);
    try {
      const count = await task();
      toast.success(`Export terminé : ${pluralize(count, 'ligne')}`);
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Sauvegarde complète" description="Toutes les données que vous pouvez consulter, dans un seul fichier JSON.">
        <Button variant="primary" disabled={busy} onClick={() => void run(exportJson)}>
          <FileJson aria-hidden />
          Exporter en JSON
        </Button>
      </Panel>
      <Panel title="Export CSV" description="Une table à la fois, pour Excel ou un tableur.">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Table" className="min-w-60 flex-1">
            <NativeSelect value={table} onChange={(e) => setTable(e.target.value as ExportTable)}>
              {EXPORT_TABLES.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Button disabled={busy} onClick={() => void run(() => exportCsv(table))}>
            <FileSpreadsheet aria-hidden />
            Exporter en CSV
          </Button>
        </div>
      </Panel>
    </div>
  );
}
