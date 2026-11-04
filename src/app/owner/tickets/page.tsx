import { Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterTabs } from "@/components/shared/filter-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { getRooms } from "@/features/owner/data"
import { CATEGORY_LABEL, PRIORITY_LABEL, shortId } from "@/features/owner/labels"
import { PriorityLabel, SlaIndicator } from "@/features/owner/tickets/sla"
import { api } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import { oneOf, str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { MaintenancePriority, MaintenanceStatus, TicketSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Maintenance" }

const STATUSES: MaintenanceStatus[] = [
  "OPEN",
  "ACKNOWLEDGED",
  "IN_PROGRESS",
  "DISPUTED",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
]
const PRIORITIES: MaintenancePriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"]

export default async function OwnerTicketsPage(props: PageProps<"/owner/tickets">) {
  const searchParams = await props.searchParams
  const status = oneOf(searchParams, "status", STATUSES)
  const priority = oneOf(searchParams, "priority", PRIORITIES)
  const cursor = str(searchParams, "cursor")

  const page = await api<Page<TicketSummaryView>>("/tickets/queue", {
    query: { status, priority, cursor, limit: "20" },
  })
  const rooms = await getRooms(page.items.map((t) => t.roomId))
  const filtered = Boolean(status || priority || cursor)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Maintenance"
        description="Requests from tenants in your rooms, soonest response target first."
      />

      <div className="flex flex-col gap-2">
        <FilterTabs
          basePath="/owner/tickets"
          searchParams={searchParams}
          tabs={[
            { value: null, label: "All active" },
            ...STATUSES.map((s) => ({
              value: s,
              label: s === "IN_PROGRESS" ? "In progress" : s.charAt(0) + s.slice(1).toLowerCase(),
            })),
          ]}
        />
        <FilterTabs
          basePath="/owner/tickets"
          searchParams={searchParams}
          param="priority"
          label="Filter by priority"
          tabs={[
            { value: null, label: "Any priority" },
            ...PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] })),
          ]}
        />
      </div>
      {!status && (
        <p className="-mt-3 text-[0.8125rem] text-muted-foreground">
          &ldquo;All active&rdquo; shows every ticket that isn&apos;t closed or cancelled.
        </p>
      )}

      {page.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={filtered ? "No tickets match these filters" : "No open maintenance requests"}
          description={
            filtered
              ? "Try another status or priority."
              : "When a tenant reports a problem in one of your rooms, it lands here with a response target."
          }
          action={
            filtered ? (
              <Button variant="outline" asChild>
                <Link href="/owner/tickets">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            caption="Maintenance tickets"
            rows={page.items}
            rowKey={(t) => t.id}
            mobileAside={(t) => <StatusBadge status={t.status} />}
            columns={[
              {
                key: "title",
                header: "Request",
                cell: (t) => (
                  <Link href={`/owner/tickets/${t.id}`} className="block min-w-0 hover:underline">
                    <span className="font-medium">{t.title}</span>
                    <span className="block truncate text-[0.8125rem] font-normal text-muted-foreground">
                      {CATEGORY_LABEL[t.category]} ·{" "}
                      {rooms.get(t.roomId)?.label ?? `Room ${shortId(t.roomId)}`}
                    </span>
                  </Link>
                ),
              },
              { key: "priority", header: "Priority", cell: (t) => <PriorityLabel priority={t.priority} /> },
              {
                key: "status",
                header: "Status",
                cell: (t) => <StatusBadge status={t.status} />,
                hideOnMobile: true,
              },
              {
                key: "sla",
                header: "Response target",
                cell: (t) => (
                  <SlaIndicator target={t.slaTargetAt} breachedAt={t.slaBreachedAt} status={t.status} />
                ),
              },
              { key: "created", header: "Reported", cell: (t) => formatDate(t.createdAt) },
            ]}
          />
          <CursorPagination
            basePath="/owner/tickets"
            searchParams={searchParams}
            nextCursor={page.nextCursor}
            itemCount={page.items.length}
          />
        </>
      )}
    </div>
  )
}
