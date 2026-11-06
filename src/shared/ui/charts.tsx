import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

/** Couleurs des séries : tokens du thème, donc lisibles en clair comme en sombre. */
export const SERIES = {
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--fg-subtle))',
  warning: 'hsl(var(--warning))',
  success: 'hsl(var(--success))',
};

export interface Serie {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
}

interface TrendChartProps {
  data: Record<string, string | number | null>[];
  xKey: string;
  series: Serie[];
  height?: number;
  yDomain?: [number, number];
  yTicks?: number[];
  formatY?: (v: number) => string;
}

/** Courbes d'évolution sobres : grille horizontale fine, pas d'aire, points discrets en fin de série. */
export function TrendChart({ data, xKey, series, height = 240, yDomain, yTicks, formatY = String }: TrendChartProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="inline-block w-3" style={{ height: 2, background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--line))" />
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--fg-subtle))', fontSize: 12 }} dy={6} />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={yDomain}
              ticks={yTicks}
              tickFormatter={formatY}
              tick={{ fill: 'hsl(var(--fg-subtle))', fontSize: 12 }}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(var(--line-strong))' }}
              formatter={(value: number, name: string) => [formatY(value), series.find((s) => s.key === name)?.label ?? name]}
              contentStyle={{
                background: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--line))',
                borderRadius: 6,
                fontSize: 12,
                color: 'hsl(var(--fg))',
                boxShadow: 'none',
              }}
              labelStyle={{ color: 'hsl(var(--fg-muted))', marginBottom: 4 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={s.dashed ? 1.5 : 2}
                strokeDasharray={s.dashed ? '4 4' : undefined}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Mini-courbe sans axes pour les tableaux (météo individuelle, charge). */
export function Sparkline({ values, max = 5, min = 1, width = 96, height = 24 }: { values: (number | null)[]; max?: number; min?: number; width?: number; height?: number }) {
  const pts = values
    .map((v, i) => (v === null ? null : [(i / Math.max(1, values.length - 1)) * (width - 4) + 2, height - 2 - ((v - min) / (max - min)) * (height - 4)]))
    .filter((p): p is number[] => p !== null);
  if (pts.length < 2) return <span className="text-xs text-fg-subtle">—</span>;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="hsl(var(--fg-subtle))" strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="hsl(var(--accent))" />
    </svg>
  );
}
