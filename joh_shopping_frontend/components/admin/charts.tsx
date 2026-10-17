"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n/client";
import { cn, formatDate, formatNumber, formatTZS } from "@/lib/utils";

/*
 * Chart conventions (dataviz skill): one series per chart (no dual axes),
 * series colour from --chart-* tokens, 2px lines, ~10% area wash, hairline
 * solid grid, ≤24px bars with 4px rounded data ends, hover tooltips, and
 * text in ink tokens — never the series colour.
 */

type Point = { date: string; value: number };

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  format: (v: number) => string;
}) {
  const { locale } = useT();
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="text-muted-foreground">{formatDate(label, locale, { weekday: "short", day: "numeric", month: "short" })}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{format(payload[0]!.value)}</p>
    </div>
  );
}

export function TrendChart({
  data,
  kind = "area",
  money = true,
  height = 280,
  label,
}: {
  data: Point[];
  kind?: "area" | "column";
  money?: boolean;
  height?: number;
  label: string;
}) {
  const { locale } = useT();
  const format = (v: number) => (money ? formatTZS(v) : formatNumber(v));
  const tick = (v: number) => (money ? formatTZS(v, { compact: true }).replace("TSh\u00a0", "") : formatNumber(v));
  const xTick = (v: string) => formatDate(v, locale, { day: "numeric", month: "short" });
  const common = {
    data,
    margin: { top: 8, right: 8, bottom: 0, left: 0 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
      <XAxis dataKey="date" tickFormatter={xTick} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} minTickGap={24} />
      <YAxis tickFormatter={tick} tickLine={false} axisLine={false} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} width={48} allowDecimals={false} />
      <Tooltip content={<ChartTooltip format={format} />} cursor={kind === "area" ? { stroke: "var(--chart-axis)", strokeWidth: 1 } : { fill: "var(--chart-grid)", opacity: 0.6 }} />
    </>
  );
  return (
    <div role="img" aria-label={label} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart {...common}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.14} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes}
            <Area
              type="linear"
              dataKey="value"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#trend-fill)"
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: "var(--chart-1)" }}
            />
          </AreaChart>
        ) : (
          <BarChart {...common} barCategoryGap={2}>
            {axes}
            <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar list — one series, value labels at the bar tip, hover detail. */
export function BarList({
  items,
  format = (v) => formatTZS(v, { compact: true }),
  className,
}: {
  items: { key: string; label: React.ReactNode; value: number; detail?: string; adornment?: React.ReactNode }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((i) => (
        <li key={i.key} className="group relative">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate">
              {i.adornment}
              <span className="truncate">{i.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums">{format(i.value)}</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-chart-grid">
            <div className="h-full rounded-full bg-chart-1 transition-all duration-700" style={{ width: `${Math.max(2, (i.value / max) * 100)}%` }} />
          </div>
          {i.detail && (
            <span className="pointer-events-none absolute -top-8 right-0 z-10 rounded-lg bg-neutral-950 px-2 py-1 text-[11px] text-white opacity-0 shadow transition group-hover:opacity-100 dark:bg-white dark:text-neutral-950">
              {i.detail}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Two-part share bar (e.g. new vs used) with legend and direct labels. */
export function ShareBar({ parts }: { parts: { label: string; value: number; color: "1" | "2" }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-6 w-full gap-0.5 overflow-hidden rounded-md">
        {parts.map((p) => (
          <div
            key={p.label}
            className={cn("h-full first:rounded-l-md last:rounded-r-md", p.color === "1" ? "bg-chart-1" : "bg-chart-2")}
            style={{ width: `${(p.value / total) * 100}%` }}
            title={`${p.label}: ${formatTZS(p.value)}`}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2 text-sm">
            <span className={cn("mt-1 size-2.5 shrink-0 rounded-sm", p.color === "1" ? "bg-chart-1" : "bg-chart-2")} />
            <span>
              <span className="block text-muted-foreground">{p.label}</span>
              <span className="font-semibold tabular-nums">{Math.round((p.value / total) * 100)}%</span>
              <span className="ml-1.5 text-xs text-muted-foreground">{formatTZS(p.value, { compact: true })}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
