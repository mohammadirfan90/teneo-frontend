import { Building2, ClipboardList, FileSignature, Plus, Wrench } from "lucide-react"
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
import { formatDate } from "@/lib/format"
import type { Page } from "@/types/api"
import {
  OPEN_APPLICATION_STATUSES,
  OPEN_TICKET_STATUSES,
  type ApplicationView,
  type LeaseSummaryView,
  type PropertyView,
  type TicketSummaryView,
} from "@/types/domain"

export const metadata: Metadata = { title: "Overview" }

export default async function OwnerOverviewPage() {
  const [me, properties, applications, leases, tickets] = await Promise.all([
    getMe(),
    api<Page<PropertyView>>("/properties/me", { query: { limit: 100 } }),
    api<Page<ApplicationView>>("/applications", { query: { limit: 100 } }),
    api<Page<LeaseSummaryView>>("/leases/me"),
    api<Page<TicketSummaryView>>("/tickets/queue", { query: { limit: "100" } }),
  ])

  const kyc = me.kycStatus?.owner ?? "NONE"
  const published = properties.items.filter((p) => p.status === "PUBLISHED").length
  const toReview = applications.items.filter((a) => OPEN_APPLICATION_STATUSES.includes(a.status))
  const activeLeases = leases.items.filter((l) => l.status === "ACTIVE").length
  const awaitingSignature = leases.items.filter((l) => l.status === "DRAFT").length
  const openTickets = tickets.items.filter((t) => OPEN_TICKET_STATUSES.includes(t.status))
  const breached = openTickets.filter((t) => t.slaBreachedAt).length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Listings, applicants and tenants that need you today."
        actions={
          properties.items.length > 0 ? (
            <Button asChild>
              <Link href="/owner/properties/new">
                <Plus /> Add property
              </Link>
            </Button>
          ) : null
        }
      />

      <KycCallout status={kyc} href="/owner/profile" action="publish listings" />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Published properties"
          value={published}
          hint={`${countLabel(properties)} in total`}
          icon={Building2}
          href="/owner/properties"
        />
        <StatCard
          label="Applications to review"
          value={countLabel(applications, toReview.length)}
          hint={toReview.length ? "Applicants are waiting" : "All caught up"}
          icon={ClipboardList}
          href="/owner/applications"
        />
        <StatCard
          label="Active leases"
          value={activeLeases}
          hint={awaitingSignature ? `${awaitingSignature} awaiting signature` : undefined}
          icon={FileSignature}
          href="/owner/leases"
        />
        <StatCard
          label="Open maintenance"
          value={countLabel(tickets, openTickets.length)}
          hint={breached ? `${breached} past response target` : undefined}
          icon={Wrench}
          href="/owner/tickets"
        />
      </section>

      {properties.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="List your first property"
          description="Add the building, its flats and rooms, upload photos, then publish once your identity is verified."
          action={
            <Button asChild>
              <Link href="/owner/properties/new">
                <Plus /> Add property
              </Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="to-review" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="to-review" className="text-lg font-semibold">
              Applications awaiting a decision
            </h2>
            {toReview.length > 0 && (
              <Button variant="link" asChild>
                <Link href="/owner/applications">View all</Link>
              </Button>
            )}
          </div>
          {toReview.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title="No applications waiting"
              description="New applications for your published rooms appear here."
            />
          ) : (
            <DataTable
              caption="Applications awaiting a decision"
              rows={toReview.slice(0, 6)}
              rowKey={(a) => a.id}
              mobileAside={(a) => <StatusBadge status={a.status} />}
              columns={[
                {
                  key: "applicant",
                  header: "Applicant",
                  cell: (a) => (
                    <Link href={`/owner/applications/${a.id}`} className="font-medium hover:underline">
                      {a.tenant.displayName}
                    </Link>
                  ),
                },
                { key: "property", header: "Property", cell: (a) => a.property.title },
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
      )}
    </div>
  )
}
