import { Building2, ReceiptText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateMeterDialog } from "@/features/owner/billing/create-meter-dialog"
import { EarningsChart } from "@/features/owner/billing/earnings-chart"
import { GenerateInvoiceDialog } from "@/features/owner/billing/generate-invoice-dialog"
import { MetersSection, MetersSkeleton } from "@/features/owner/billing/meters-section"
import { PropertyPicker } from "@/features/owner/billing/property-picker"
import type { BillableLease } from "@/features/owner/billing/schemas"
import { getMyProperties, getRooms } from "@/features/owner/data"
import { shortId } from "@/features/owner/labels"
import { api } from "@/lib/api/server"
import { formatDate, formatMoney } from "@/lib/format"
import { str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { InvoiceSummaryView, LeaseSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Billing & earnings" }

export default async function OwnerBillingPage(props: PageProps<"/owner/billing">) {
  const sp = await props.searchParams
  // /invoices/me: first page only (fixed 20) — later pages can leak other users' rows (backend bug).
  const [invoices, leases, properties] = await Promise.all([
    api<Page<InvoiceSummaryView>>("/invoices/me"),
    api<Page<LeaseSummaryView>>("/leases/me"),
    getMyProperties(),
  ])
  const ownLeases = leases.items.filter((l) => l.role === "OWNER")
  const rooms = await getRooms(ownLeases.map((l) => l.roomId))
  const propertyTitle = new Map(properties.items.map((p) => [p.id, p.title]))
  const leaseById = new Map(ownLeases.map((l) => [l.id, l]))

  const roomLabel = (roomId: string) => {
    const room = rooms.get(roomId)
    if (!room) return `Room ${shortId(roomId)}`
    const title = propertyTitle.get(room.propertyId)
    return title ? `${room.label} · ${title}` : room.label
  }

  const billable: BillableLease[] = ownLeases
    .filter((l) => l.status === "ACTIVE")
    .map((l) => ({
      id: l.id,
      label: roomLabel(l.roomId),
      start: l.startDate.slice(0, 10),
      end: l.endDate.slice(0, 10),
      currency: l.currency,
      rentMinor: l.rentMinor,
    }))

  const titleCount = new Map<string, number>()
  for (const p of properties.items) titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1)
  const propertyOptions = properties.items.map((p) => ({
    id: p.id,
    label: `${p.title} · ${p.city}${(titleCount.get(p.title) ?? 0) > 1 ? ` · #${shortId(p.id)}` : ""}`,
  }))
  const requested = str(sp, "property")
  const selected = properties.items.find((p) => p.id === requested) ?? properties.items[0]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Billing & earnings"
        description="Invoice active leases, track what tenants have paid and keep utility meters up to date."
        actions={<GenerateInvoiceDialog leases={billable} />}
      />

      <section
        aria-labelledby="earnings"
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-6"
      >
        <div>
          <h2 id="earnings" className="text-lg font-semibold">
            Earnings
          </h2>
          <p className="text-sm text-muted-foreground">
            Paid against invoiced, by billing month, from your most recent invoices (up to 20).
          </p>
        </div>
        <EarningsChart invoices={invoices.items} />
      </section>

      <section aria-labelledby="invoices" className="flex flex-col gap-4">
        <div>
          <h2 id="invoices" className="text-lg font-semibold">
            Invoices
          </h2>
          <p className="text-sm text-muted-foreground">Most recently generated first.</p>
        </div>
        {invoices.items.length === 0 ? (
          <EmptyState
            compact
            icon={ReceiptText}
            title="No invoices yet"
            description={
              billable.length
                ? "Use “Generate invoice” to bill an active lease for a period."
                : "Invoices can be generated once a lease is signed and the tenant has moved in."
            }
            action={
              billable.length ? null : (
                <Button variant="outline" asChild>
                  <Link href="/owner/leases">View leases</Link>
                </Button>
              )
            }
          />
        ) : (
          <DataTable
            caption="Invoices"
            rows={invoices.items}
            rowKey={(i) => i.id}
            mobileAside={(i) => <StatusBadge status={i.status} />}
            columns={[
              {
                key: "period",
                header: "Period",
                cell: (i) => (
                  <span className="whitespace-nowrap">
                    {formatDate(i.periodStart, { year: undefined })} – {formatDate(i.periodEnd)}
                  </span>
                ),
              },
              {
                key: "room",
                header: "Room",
                cell: (i) => {
                  const lease = leaseById.get(i.leaseId)
                  return lease ? (
                    <Link href={`/owner/leases/${lease.id}`} className="hover:underline">
                      {roomLabel(lease.roomId)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Lease {shortId(i.leaseId)}</span>
                  )
                },
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                cell: (i) => formatMoney(i.totalMinor, i.currency),
              },
              {
                key: "paid",
                header: "Paid",
                align: "right",
                cell: (i) => formatMoney(i.amountPaidMinor, i.currency),
              },
              {
                key: "status",
                header: "Status",
                hideOnMobile: true,
                cell: (i) => <StatusBadge status={i.status} />,
              },
              { key: "due", header: "Due", cell: (i) => formatDate(i.dueDate) },
            ]}
          />
        )}
      </section>

      <section aria-labelledby="meters" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="meters" className="text-lg font-semibold">
              Utility meters
            </h2>
            <p className="text-sm text-muted-foreground">Meters and readings for one property at a time.</p>
          </div>
          {selected && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Suspense fallback={<Skeleton className="h-9 w-full sm:w-80" />}>
                <PropertyPicker properties={propertyOptions} selected={selected.id} />
              </Suspense>
              <CreateMeterDialog key={selected.id} propertyId={selected.id} propertyTitle={selected.title} />
            </div>
          )}
        </div>
        {selected ? (
          <Suspense key={selected.id} fallback={<MetersSkeleton />}>
            <MetersSection propertyId={selected.id} />
          </Suspense>
        ) : (
          <EmptyState
            compact
            icon={Building2}
            title="No properties yet"
            description="Meters belong to a property. Add one first."
            action={
              <Button asChild>
                <Link href="/owner/properties/new">Add property</Link>
              </Button>
            }
          />
        )}
      </section>
    </div>
  )
}
