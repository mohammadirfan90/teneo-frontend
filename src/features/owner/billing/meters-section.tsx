import { Gauge } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { UTILITY_LABEL } from "@/features/owner/labels"
import type { MeterView, ReadingSummary } from "@/features/owner/types"
import { api } from "@/lib/api/server"
import { formatDate, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import { RecordReading } from "./record-reading-form"

const valueFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 })

/** Meters of one property with their latest readings. Server-rendered; mutations refresh it. */
export async function MetersSection({ propertyId }: { propertyId: string }) {
  const meters = await api<MeterView[]>(`/properties/${propertyId}/meters`)
  const readings = await Promise.all(
    meters.map((m) => api<Page<ReadingSummary>>(`/meters/${m.id}/readings`, { query: { limit: "5" } }))
  )

  return (
    <div className="flex flex-col gap-4">
      {meters.length === 0 ? (
        <EmptyState
          compact
          icon={Gauge}
          title="No meters on this property"
          description="Add a meter for electricity, water, gas or internet, then record readings. Usage between two readings is added to the next invoice."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {meters.map((m, i) => {
            const items = readings[i].items
            return (
              <li key={m.id} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{m.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {UTILITY_LABEL[m.utilityType]} ·{" "}
                      <span className="tabular-nums">
                        {formatMoney(m.ratePerUnitMinor, m.currency)} per {m.unitLabel}
                      </span>
                    </p>
                  </div>
                  {!m.isActive && <span className="text-xs text-muted-foreground">Inactive</span>}
                </div>

                {items.length === 0 ? (
                  <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-muted-foreground">
                    No readings yet. Record one at the start of a billing period and another at the end.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <caption className="sr-only">Latest readings for {m.label}</caption>
                    <thead>
                      <tr className="text-left text-[0.8125rem] text-muted-foreground">
                        <th scope="col" className="pb-1.5 font-medium">
                          Date
                        </th>
                        <th scope="col" className="pb-1.5 text-right font-medium">
                          Reading
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((r) => (
                        <tr key={r.id}>
                          <td className="py-1.5">{formatDate(r.readingDate)}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {valueFmt.format(Number(r.readingValue))} {m.unitLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="mt-auto border-t pt-4">
                  <RecordReading meterId={m.id} unitLabel={m.unitLabel} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function MetersSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Loading meters">
      <Skeleton className="ml-auto h-9 w-32" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
