import { FileSignature } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterTabs } from "@/components/shared/filter-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { getProperty, getRecentApplications, getRooms } from "@/features/owner/data"
import { shortId } from "@/features/owner/labels"
import { api } from "@/lib/api/server"
import { formatDate, formatMoney } from "@/lib/format"
import { oneOf } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { LeaseStatus, LeaseSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Leases" }

const STATUSES: LeaseStatus[] = ["DRAFT", "SIGNED", "ACTIVE", "TERMINATED", "ENDED"]
const TAB_LABEL: Record<LeaseStatus, string> = {
  DRAFT: "Awaiting signatures",
  SIGNED: "Signed",
  ACTIVE: "Active",
  TERMINATED: "Terminated",
  ENDED: "Ended",
}

export default async function OwnerLeasesPage(props: PageProps<"/owner/leases">) {
  const searchParams = await props.searchParams
  const status = oneOf(searchParams, "status", STATUSES)

  const [leases, apps] = await Promise.all([
    api<Page<LeaseSummaryView>>("/leases/me"),
    getRecentApplications(),
  ])
  const owned = leases.items.filter((l) => l.role === "OWNER")
  const rooms = await getRooms(owned.map((l) => l.roomId))
  const propertyIds = [...new Set([...rooms.values()].map((r) => r.propertyId))]
  const properties = new Map(
    (await Promise.all(propertyIds.map((id) => getProperty(id)))).flatMap((p) =>
      p ? [[p.id, p] as const] : []
    )
  )
  // The lease summary has no tenant; the approved application for the room names them.
  const tenantByRoom = new Map(
    apps.filter((a) => a.status === "APPROVED").map((a) => [a.roomId, a.tenant.displayName] as const)
  )

  const rows = status ? owned.filter((l) => l.status === status) : owned

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leases"
        description="Leases are created when you approve an application. Sign drafts, propose changes, or end a tenancy."
      />

      {owned.length > 0 && (
        <FilterTabs
          basePath="/owner/leases"
          searchParams={searchParams}
          tabs={[{ value: null, label: "All" }, ...STATUSES.map((s) => ({ value: s, label: TAB_LABEL[s] }))]}
        />
      )}

      {owned.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No leases yet"
          description="When you approve a shortlisted applicant, Teneo drafts a lease for both of you to sign."
          action={
            <Button asChild>
              <Link href="/owner/applications">Review applications</Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={FileSignature}
          title={`No ${TAB_LABEL[status ?? "ACTIVE"].toLowerCase()} leases`}
          description="Try another status."
          action={
            <Button variant="outline" asChild>
              <Link href="/owner/leases">Show all leases</Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Your leases"
          rows={rows}
          rowKey={(l) => l.id}
          mobileAside={(l) => <StatusBadge status={l.status} />}
          columns={[
            {
              key: "room",
              header: "Room",
              cell: (l) => {
                const room = rooms.get(l.roomId)
                const property = room ? properties.get(room.propertyId) : undefined
                return (
                  <Link href={`/owner/leases/${l.id}`} className="block min-w-0 hover:underline">
                    <span className="font-medium">{room?.label ?? `Room ${shortId(l.roomId)}`}</span>
                    {property && (
                      <span className="block truncate text-[0.8125rem] font-normal text-muted-foreground">
                        {property.title}
                      </span>
                    )}
                  </Link>
                )
              },
            },
            { key: "tenant", header: "Tenant", cell: (l) => tenantByRoom.get(l.roomId) ?? "—" },
            {
              key: "status",
              header: "Status",
              cell: (l) => <StatusBadge status={l.status} />,
              hideOnMobile: true,
            },
            {
              key: "period",
              header: "Term",
              cell: (l) => (
                <span className="whitespace-normal">
                  {formatDate(l.startDate)} – {formatDate(l.endDate)}
                </span>
              ),
            },
            {
              key: "rent",
              header: "Rent / month",
              align: "right",
              cell: (l) => formatMoney(l.rentMinor, l.currency),
            },
          ]}
        />
      )}
      {leases.nextCursor && (
        <p className="text-sm text-muted-foreground">
          Showing your 20 most recent leases. The API doesn&apos;t page further back yet.
        </p>
      )}
    </div>
  )
}
