import { cn } from '@/shared/lib/cn';

const SLATE = ['bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-300', 'bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900'];

const SEMANTIC = [
  { name: 'accent', className: 'bg-accent' },
  { name: 'accent-subtle', className: 'bg-accent-subtle' },
  { name: 'success', className: 'bg-success' },
  { name: 'success-subtle', className: 'bg-success-subtle' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'warning-subtle', className: 'bg-warning-subtle' },
  { name: 'danger', className: 'bg-danger' },
  { name: 'danger-subtle', className: 'bg-danger-subtle' },
];

export function TokenSwatches() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
        {SLATE.map((c, i) => (
          <div key={c} className="flex flex-col gap-1">
            <div className={cn('h-10 rounded border border-line', c)} />
            <span className="tabular text-xs text-fg-subtle">{i === 0 ? 50 : i * 100}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
        {SEMANTIC.map((c) => (
          <div key={c.name} className="flex flex-col gap-1">
            <div className={cn('h-10 rounded border border-line', c.className)} />
            <span className="truncate text-xs text-fg-subtle">{c.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCALE = [
  { cls: 'text-xl font-semibold', label: '24 — titre de page', sample: 'Entretiens de novembre' },
  { cls: 'text-lg font-semibold', label: '20 — titre de section', sample: 'Objectifs du trimestre' },
  { cls: 'text-md font-medium', label: '16 — titre de fenêtre', sample: 'Planifier un entretien' },
  { cls: 'text-base', label: '14 — corps', sample: 'Mise en service de la ligne 3 chez Fromagerie Bel' },
  { cls: 'text-sm text-fg-muted', label: '13 — secondaire', sample: 'Modifié par Claire Vasseur le 28 oct. 2026' },
  { cls: 'text-xs text-fg-subtle', label: '12 — méta', sample: 'S45 · 3 tâches · 12 450 €' },
];

export function TypeScale() {
  return (
    <div className="divide-y divide-line">
      {SCALE.map((s) => (
        <div key={s.label} className="grid grid-cols-[180px_1fr] items-baseline gap-4 py-2">
          <span className="text-xs text-fg-subtle">{s.label}</span>
          <span className={cn('truncate', s.cls)}>{s.sample}</span>
        </div>
      ))}
    </div>
  );
}
