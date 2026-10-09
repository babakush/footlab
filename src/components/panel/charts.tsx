"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const AXIS = { stroke: "#5b626b", fontSize: 11, tickLine: false, axisLine: false } as const;
const GRID = "#1f2328";

function ChartTooltip({ active, payload, label, unit, labels }: {
  active?: boolean; payload?: { value: number; name: string; color: string; dataKey: string }[]; label?: string; unit?: string; labels?: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-elevated px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span>{labels?.[p.dataKey] ?? p.name}:</span>
          <span className="font-medium tabular">{new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(p.value)}{unit ? ` ${unit}` : ""}</span>
        </p>
      ))}
    </div>
  );
}

export function WeeklyBarChart({ data, dataKey, unit, height = 200, highlightLast = true, name }: {
  data: { label: string; [k: string]: number | string }[]; dataKey: string; unit?: string; height?: number; highlightLast?: boolean; name: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de barras: ${name} por semana`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} allowDecimals={false} width={44} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<ChartTooltip unit={unit} />} />
          <Bar dataKey={dataKey} name={name} radius={[6, 6, 2, 2]} maxBarSize={36} animationDuration={600}>
            {data.map((_, i) => (
              <Cell key={i} fill={highlightLast && i === data.length - 1 ? "#c6f432" : "#3a4048"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiLineChart({ data, lines, height = 220, unit, domain }: {
  data: { label: string; [k: string]: number | string | null }[];
  lines: { key: string; name: string; color: string }[];
  height?: number; unit?: string; domain?: [number, number];
}) {
  return (
    <div style={{ height }} role="img" aria-label={`Gráfico de líneas: ${lines.map((l) => l.name).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={44} domain={domain ?? ["auto", "auto"]} allowDecimals />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#8b929b" }} />
          {lines.map((l) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls animationDuration={600} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBars({ data }: { data: { name: string; minutes: number; color: string }[] }) {
  return (
    <div style={{ height: Math.max(120, data.length * 36) }} role="img" aria-label="Minutos por tipo de sesión">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" {...AXIS} width={92} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }} content={<ChartTooltip unit="min" />} />
          <Bar dataKey="minutes" name="Minutos" radius={[2, 6, 6, 2]} maxBarSize={22} animationDuration={600}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
