import { ClipboardList, FileSignature, ReceiptText, Search, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { KycCallout } from "@/components/shared/kyc-callout"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { api, getMe } from "@/lib/api/server"
import { countLabel } from "@/lib/counts"
import { formatDate, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import {
  OPEN_APPLICATION_STATUSES,
  OPEN_TICKET_STATUSES,
  UNPAID_INVOICE_STATUSES,
  type ApplicationView,
  type InvoiceSummaryView,
  type LeaseSummaryView,
  type TicketSummaryView,
} from "@/types/domain"

export const metadata: Metadata = { title: "Overview" }

export default async function TenantOverviewPage() {
  const [me, applications, leases, invoices, tickets] = await Promise.all([
    getMe(),
    api<Page<ApplicationView>>("/applications", { query: { limit: 20 } }),
    api<Page<LeaseSummaryView>>("/leases/me"),
    api<Page<InvoiceSummaryView>>("/invoices/me"),
    api<Page<TicketSummaryView>>("/tickets/me", { query: { limit: "50" } }),
  ])

  const kyc = me.kycStatus?.tenant ?? "NONE"
  const openApps = applications.items.filter((a) => OPEN_APPLICATION_STATUSES.includes(a.status))
  const lease =
    leases.items.find((l) => l.status === "ACTIVE") ??
    leases.items.find((l) => l.status === "SIGNED" || l.status === "DRAFT")
  const nextInvoice = invoices.items
    .filter((i) => UNPAID_INVOICE_STATUSES.includes(i.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const openTickets = tickets.items.filter((t) => OPEN_TICKET_STATUSES.includes(t.status))
  const recent = applications.items.slice(0, 5)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Where your applications, lease and payments stand today."
        actions={
          nextInvoice ? (
            <Button asChild>
              <Link href="/dashboard/payments">
                <ReceiptText /> Pay rent
              </Link>
            </Button>
          ) : recent.length > 0 ? (
            <Button asChild>
              <Link href="/rooms">
                <Search /> Find a room
              </Link>
            </Button>
          ) : null
        }
      />

      <KycCallout status={kyc} href="/dashboard/profile" action="apply for rooms" />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Applications in progress"
          value={countLabel(applications, openApps.length)}
          hint={openApps.length ? "Waiting on the owner" : "None open"}
          icon={ClipboardList}
          href="/dashboard/applications"
        />
        <StatCard
          label="Lease"
          value={lease ? <StatusBadge status={lease.status} /> : "None"}
          hint={
            lease
              ? `${formatDate(lease.startDate)} – ${formatDate(lease.endDate)}`
              : "Signed leases show here"
          }
          icon={FileSignature}
          href="/dashboard/lease"
        />
        <StatCard
          label="Next payment"
          value={
            nextInvoice
              ? formatMoney(
                  Number(nextInvoice.totalMinor) - Number(nextInvoice.amountPaidMinor),
                  nextInvoice.currency
                )
              : "Nothing due"
          }
          hint={nextInvoice ? `Due ${formatDate(nextInvoice.dueDate)}` : undefined}
          icon={ReceiptText}
          href="/dashboard/payments"
        />
        <StatCard
          label="Open maintenance"
          value={countLabel(tickets, openTickets.length)}
          hint={openTickets.some((t) => t.slaBreachedAt) ? "Past response target" : undefined}
          icon={Wrench}
          href="/dashboard/tickets"
        />
      </section>

      <section aria-labelledby="recent-apps" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-apps" className="text-lg font-semibold">
            Recent applications
          </h2>
          {recent.length > 0 && (
            <Button variant="link" asChild>
              <Link href="/dashboard/applications">View all</Link>
            </Button>
          )}
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            description="Find a room you like and apply. Every step, from screening to signing, shows up here."
            action={
              <Button asChild>
                <Link href="/rooms">
                  <Search /> Browse rooms
                </Link>
              </Button>
            }
          />
        ) : (
          <DataTable
            caption="Recent applications"
            rows={recent}
            rowKey={(a) => a.id}
            mobileAside={(a) => <StatusBadge status={a.status} />}
            columns={[
              {
                key: "property",
                header: "Property",
                cell: (a) => (
                  <Link href={`/dashboard/applications/${a.id}`} className="font-medium hover:underline">
                    {a.property.title}
                  </Link>
                ),
              },
              { key: "city", header: "City", cell: (a) => a.property.city },
              {
                key: "status",
                header: "Status",
                cell: (a) => <StatusBadge status={a.status} />,
                hideOnMobile: true,
              },
              { key: "submitted", header: "Submitted", cell: (a) => formatDate(a.submittedAt) },
            ]}
          />
        )}
      </section>
    </div>
  )
}
