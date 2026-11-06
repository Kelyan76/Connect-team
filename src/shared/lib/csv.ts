type Cell = string | number | boolean | null | undefined | object;

function escapeCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const BOM = String.fromCharCode(0xfeff);

/** CSV lisible par Excel en français : séparateur « ; », BOM UTF-8. */
export function toCsv(rows: Record<string, Cell>[]): string {
  if (rows.length === 0) return BOM;
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lines = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(';')),
  ];
  return `${BOM}${lines.join('\r\n')}`;
}

export function downloadFile(content: BlobPart, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
