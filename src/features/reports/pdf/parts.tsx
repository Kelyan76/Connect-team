import { Text, View } from '@react-pdf/renderer';
import type { ReactNode } from 'react';
import { formatDateTime } from '@/shared/lib/format';
import { s } from './styles';

export function Header({ company, kind }: { company: string; kind: string }) {
  return (
    <View style={s.header} fixed>
      <View>
        <Text style={s.brand}>Connect Team</Text>
        <Text style={s.subtle}>{company}</Text>
      </View>
      <Text style={s.meta}>
        {kind}
        {'\n'}Édité le {formatDateTime(new Date())}
      </Text>
    </View>
  );
}

export function Footer({ note }: { note: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{note}</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export interface Column<T> {
  label: string;
  width: number;
  right?: boolean;
  render: (row: T) => ReactNode;
}

/** Tableau PDF compact : en-tête gris, filets fins, nombres alignés à droite. */
export function PdfTable<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <View>
      <View style={s.row}>
        {columns.map((c) => (
          <Text key={c.label} style={[s.th, s.cell, { width: `${c.width}%` }, c.right ? s.right : {}]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={s.row} wrap={false}>
          {columns.map((c) => (
            <Text key={c.label} style={[s.cell, { width: `${c.width}%` }, c.right ? s.right : {}]}>
              {c.render(row)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function Kpis({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={s.kpis}>
      {items.map((k, i) => (
        <View key={k.label} style={[s.kpi, i === items.length - 1 ? { borderRightWidth: 0 } : {}]}>
          <Text style={s.subtle}>{k.label}</Text>
          <Text style={s.kpiValue}>{k.value}</Text>
        </View>
      ))}
    </View>
  );
}
