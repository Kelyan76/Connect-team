import { useMemo, useState } from 'react';

export interface SortState<K extends string> {
  key: K;
  direction: 'asc' | 'desc';
}

type Comparable = string | number | null | undefined;

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export function compareValues(a: Comparable, b: Comparable): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

/** Tri client d'un tableau : un clic trie, un second clic inverse. Les valeurs vides restent en bas. */
export function useSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => Comparable>,
  initial: SortState<NoInfer<K>>,
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const sorted = useMemo(() => {
    const get = accessors[sort.key];
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va === null || va === undefined || vb === null || vb === undefined) return compareValues(va, vb);
      return compareValues(va, vb) * factor;
    });
    // Les accesseurs sont des définitions statiques : seul le tri et les lignes comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));

  return { sorted, sort, toggle };
}
