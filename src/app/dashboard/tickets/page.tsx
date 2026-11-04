import { Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getRoomContexts } from "@/features/tenant/data"
import { CATEGORY_LABEL, PRIORITY_LABEL, TICKET_STATUS_LABEL } from "@/features/tenant/labels"
import { NewTicketDialog, TicketFilters, type RoomOption } from "@/features/tenant/tickets"
import { api } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import { oneOf, str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type {
  LeaseSummaryView,
  MaintenancePriority,
  MaintenanceStatus,
  TicketSummaryView,
} from "@/types/domain"

export const metadata: Metadata = { title: "Maintenance" }

const STATUSES = Object.keys(TICKET_STATUS_LABEL) as MaintenanceStatus[]
const PRIORITIES = Object.keys(PRIORITY_LABEL) as MaintenancePriority[]

export default async function TicketsPage(props: PageProps<"/dashboard/tickets">) {
  const sp = await props.searchParams
  const status = oneOf(sp, "status", STATUSES)
  const priority = oneOf(sp, "priority", PRIORITIES)
  const cursor = str(sp, "cursor")

  const [page, leases] = await Promise.all([
    api<Page<TicketSummaryView>>("/tickets/me", { query: { status, priority, cursor, limit: "20" } }),
    api<Page<LeaseSummaryView>>("/leases/me"),
  ])
  const activeRoomIds = [
    ...new Set(leases.items.filter((l) => l.status === "ACTIVE" && l.role === "TENANT").map((l) => l.roomId)),
  ]
  const rooms = await getRoomContexts([...new Set([...activeRoomIds, ...page.items.map((t) => t.roomId)])])
  const labelOf = (roomId: string) => {
    const c = rooms.get(roomId)
    return c?.room ? (c.property ? `${c.room.label}, ${c.property.title}` : c.room.label) : "Room"
  }
  const roomOptions: RoomOption[] = activeRoomIds.map((id) => ({ roomId: id, label: labelOf(id) }))
  const filtered = Boolean(status || priority || cursor)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Maintenance"
        description="Report problems in your room and follow the fix."
        actions={<NewTicketDialog rooms={roomOptions} />}
      />

      <Suspense fallback={<Skeleton className="h-9 w-full sm:w-96" />}>
        <TicketFilters />
      </Suspense>

      {page.items.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={Wrench}
            title="No requests match these filters"
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/tickets">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Wrench}
            title="No maintenance requests"
            description={
              roomOptions.length
                ? "If something in your room breaks, report it here and your owner gets notified."
                : "Once you have an active lease you can report problems with your room here."
            }
            action={
              roomOptions.length ? (
                <NewTicketDialog rooms={roomOptions} triggerVariant="outline" />
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <DataTable
            caption="Maintenance requests"
            rows={page.items}
            rowKey={(t) => t.id}
            mobileAside={(t) => <StatusBadge status={t.status} label={TICKET_STATUS_LABEL[t.status]} />}
            columns={[
              {
                key: "title",
                header: "Request",
                cell: (t) => (
                  <Link href={`/dashboard/tickets/${t.id}`} className="font-medium hover:underline">
                    {t.title}
                  </Link>
                ),
              },
              {
                key: "room",
                header: "Room",
                cell: (t) => <span className="block max-w-52 truncate">{labelOf(t.roomId)}</span>,
              },
              { key: "category", header: "Category", cell: (t) => CATEGORY_LABEL[t.category] },
              { key: "priority", header: "Urgency", cell: (t) => PRIORITY_LABEL[t.priority] },
              {
                key: "status",
                header: "Status",
                hideOnMobile: true,
                cell: (t) => <StatusBadge status={t.status} label={TICKET_STATUS_LABEL[t.status]} />,
              },
              {
                key: "reported",
                header: "Reported",
                cell: (t) => (
                  <span>
                    {formatDate(t.createdAt)}
                    {t.slaBreachedAt && <span className="ml-1.5 text-xs text-destructive">· late reply</span>}
                  </span>
                ),
              },
            ]}
          />
          <CursorPagination
            basePath="/dashboard/tickets"
            searchParams={sp}
            nextCursor={page.nextCursor}
            itemCount={page.items.length}
          />
        </>
      )}
    </div>
  )
}
