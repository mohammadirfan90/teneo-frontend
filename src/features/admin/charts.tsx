"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { ACTIVITY_GROUPS, type ActivityGroupKey } from "./labels"

export type ActivityDay = { day: string; label: string } & Record<ActivityGroupKey, number>

const activityConfig = Object.fromEntries(
  ACTIVITY_GROUPS.map((g) => [g.key, { label: g.label, color: g.color }])
) satisfies ChartConfig

/** Stacked daily columns, one stack per day, families in the validated token order. */
export function ActivityChart({ data }: { data: ActivityDay[] }) {
  const last = ACTIVITY_GROUPS.at(-1)?.key
  return (
    <div className="flex flex-col gap-3">
      {/* HTML legend so the order matches the stack (Recharts sorts its own legend by key). */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
        {ACTIVITY_GROUPS.map((g) => (
          <li key={g.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[2px]" style={{ background: g.color }} />
            {g.label}
          </li>
        ))}
      </ul>
      <ChartContainer config={activityConfig} className="aspect-auto h-64 w-full sm:h-72">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
          <ChartTooltip cursor={{ fillOpacity: 0.5 }} content={<ChartTooltipContent indicator="line" />} />
          {ACTIVITY_GROUPS.map((g) => (
            <Bar
              key={g.key}
              dataKey={g.key}
              stackId="day"
              fill={`var(--color-${g.key})`}
              stroke="var(--card)"
              strokeWidth={1}
              maxBarSize={24}
              radius={g.key === last ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

const breakdownConfig = { count: { label: "Accounts", color: "var(--chart-1)" } } satisfies ChartConfig

/** Single-series horizontal bars with the value at each tip. */
export function BreakdownChart({ data }: { data: Array<{ label: string; count: number }> }) {
  return (
    <ChartContainer
      config={breakdownConfig}
      className="aspect-auto w-full"
      style={{ height: Math.max(120, data.length * 44 + 16) }}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, left: 0, bottom: 4 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={88} tickMargin={4} />
        <ChartTooltip cursor={{ fillOpacity: 0.5 }} content={<ChartTooltipContent hideLabel={false} />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground tabular-nums"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
