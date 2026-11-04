"use client"

import { Banknote, ReceiptText } from "lucide-react"
import { useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { cn } from "cn"

import { EmptyState } from "@/components/shared/empty-state"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatMoney } from "@/lib/format"
import type { InvoiceSummaryView } from "@/types/domain"

const chartConfig = {
  total: { label: "Total invoiced", color: "var(--chart-5)" },
  paid: { label: "Paid", color: "var(--chart-1)" },
} satisfies ChartConfig

const OPEN = new Set(["DUE", "PARTIALLY_PAID", "OVERDUE", "DISPUTED"])

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })

interface MonthRow {
  month: string
  label: string
  /** Major units for plotting; formatted back with formatMoney. */
  total: number
  paid: number
}

function summarise(invoices: InvoiceSummaryView[]) {
  let invoiced = 0
  let collected = 0
  let outstanding = 0
  let openCount = 0
  const byMonth = new Map<string, MonthRow>()
  for (const inv of invoices) {
    const total = Number(inv.totalMinor)
    const paid = Number(inv.amountPaidMinor)
    invoiced += total
    collected += paid
    if (OPEN.has(inv.status)) {
      outstanding += Math.max(0, total - paid)
      openCount += 1
    }
    const month = inv.periodStart.slice(0, 7)
    const row = byMonth.get(month) ?? {
      month,
      label: monthFmt.format(new Date(`${month}-01T00:00:00Z`)),
      total: 0,
      paid: 0,
    }
    row.total += total / 100
    row.paid += paid / 100
    byMonth.set(month, row)
  }
  const rows = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month))
  return { invoiced, collected, outstanding, openCount, rows }
}

/** Paid vs invoiced per billing month, one currency at a time (amounts are never summed across currencies). */
export function EarningsChart({ invoices }: { invoices: InvoiceSummaryView[] }) {
  // Currencies that have collected money first, then by number of invoices.
  const currencies = useMemo(() => {
    const counts = new Map<string, { n: number; paid: boolean }>()
    for (const i of invoices) {
      const cur = counts.get(i.currency) ?? { n: 0, paid: false }
      counts.set(i.currency, { n: cur.n + 1, paid: cur.paid || Number(i.amountPaidMinor) > 0 })
    }
    return [...counts.entries()]
      .sort((a, b) => Number(b[1].paid) - Number(a[1].paid) || b[1].n - a[1].n)
      .map(([c]) => c)
  }, [invoices])
  const [currency, setCurrency] = useState(currencies[0])

  const data = useMemo(() => summarise(invoices.filter((i) => i.currency === currency)), [invoices, currency])

  if (invoices.length === 0) {
    return (
      <EmptyState
        compact
        icon={ReceiptText}
        title="No invoices yet"
        description="Generate an invoice for an active lease. Earnings appear here once tenants pay."
      />
    )
  }

  const money = (minor: number) => formatMoney(minor, currency)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Invoiced</dt>
            <dd className="font-medium tabular-nums">{money(data.invoiced)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Collected</dt>
            <dd className="font-medium text-success tabular-nums">{money(data.collected)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Outstanding</dt>
            <dd className="font-medium tabular-nums">{money(data.outstanding)}</dd>
          </div>
        </dl>
        {currencies.length > 1 && (
          <div role="group" aria-label="Currency" className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {currencies.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === currency}
                onClick={() => setCurrency(c)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  c === currency && "bg-card text-foreground shadow-sm"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {data.collected === 0 ? (
        <EmptyState
          compact
          icon={Banknote}
          title="No rent collected yet"
          description={`${data.openCount} ${data.openCount === 1 ? "invoice is" : "invoices are"} outstanding in ${currency} (${money(data.outstanding)}). Payments show up here as soon as tenants pay by card.`}
        />
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
          <BarChart data={data.rows} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v)
              }
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {money(Number(value) * 100)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="total" fill="var(--color-total)" fillOpacity={0.45} radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}
