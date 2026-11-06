import { useSort } from '@/shared/hooks/use-sort';
import { formatDate, formatPercent } from '@/shared/lib/format';
import { PersonLabel } from '@/shared/ui/avatar';
import { Badge, type BadgeTone } from '@/shared/ui/badge';
import { ProgressBar } from '@/shared/ui/data';
import { SortableTh, Table, TBody, Td, THead, Tr } from '@/shared/ui/table';

interface Row {
  first_name: string;
  last_name: string;
  job: string;
  progress: number;
  load: number;
  due: string;
  status: { label: string; tone: BadgeTone };
}

const ROWS: Row[] = [
  { first_name: 'Nadia', last_name: 'Haddad', job: 'Technicienne de mise en service', progress: 0.74, load: 112, due: '2026-12-18', status: { label: 'Dans les temps', tone: 'accent' } },
  { first_name: 'Julien', last_name: 'Mercier', job: 'Technicien SAV', progress: 0.31, load: 96, due: '2026-11-28', status: { label: 'À risque', tone: 'warning' } },
  { first_name: 'Karim', last_name: 'Benali', job: "Chargé d'affaires", progress: 0.88, load: 83, due: '2027-01-15', status: { label: 'En avance', tone: 'success' } },
  { first_name: 'Élodie', last_name: 'Fontaine', job: 'Assistante ADV', progress: 0.12, load: 54, due: '2026-11-15', status: { label: 'En retard', tone: 'danger' } },
];

export function DemoTable() {
  const { sorted, sort, toggle } = useSort(
    ROWS,
    {
      name: (r) => r.last_name,
      progress: (r) => r.progress,
      load: (r) => r.load,
      due: (r) => r.due,
    },
    { key: 'name', direction: 'asc' },
  );

  return (
    <div className="rounded-lg border border-line bg-surface">
      <Table>
        <THead>
          <tr>
            <SortableTh label="Collaborateur" sortKey="name" sort={sort} onSort={toggle} />
            <SortableTh label="Avancement" sortKey="progress" sort={sort} onSort={toggle} align="right" />
            <SortableTh label="Charge" sortKey="load" sort={sort} onSort={toggle} align="right" />
            <SortableTh label="Échéance" sortKey="due" sort={sort} onSort={toggle} align="right" />
            <th className="h-8 px-3 pr-4 text-left text-xs font-medium text-fg-subtle">Statut</th>
          </tr>
        </THead>
        <TBody>
          {sorted.map((r) => (
            <Tr key={r.last_name}>
              <Td>
                <PersonLabel person={r} detail={r.job} />
              </Td>
              <Td numeric>
                <div className="ml-auto flex w-32 items-center gap-3">
                  <ProgressBar value={r.progress} />
                  <span className="w-10 text-right">{formatPercent(r.progress)}</span>
                </div>
              </Td>
              <Td numeric className={r.load > 100 ? 'text-danger' : undefined}>
                {formatPercent(r.load, false)}
              </Td>
              <Td numeric>{formatDate(r.due)}</Td>
              <Td>
                <Badge tone={r.status.tone}>{r.status.label}</Badge>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
