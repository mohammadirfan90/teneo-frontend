import { ClipboardList, Search } from "lucide-react"
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
import { ApplicationFilters } from "@/features/tenant/applications"
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABEL } from "@/features/tenant/labels"
import { api } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import { oneOf, str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { ApplicationView } from "@/types/domain"

export const metadata: Metadata = { title: "Applications" }

export default async function ApplicationsPage(props: PageProps<"/dashboard/applications">) {
  const sp = await props.searchParams
  const status = oneOf(sp, "status", APPLICATION_STATUSES)
  const cursor = str(sp, "cursor")
  const page = await api<Page<ApplicationView>>("/applications", { query: { status, cursor, limit: 20 } })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        description="Every room you've applied for and where each one stands."
        actions={
          <Button asChild>
            <Link href="/rooms">
              <Search /> Find a room
            </Link>
          </Button>
        }
      />

      <Suspense fallback={<Skeleton className="h-9 w-full sm:w-56" />}>
        <ApplicationFilters />
      </Suspense>

      {page.items.length === 0 ? (
        status || cursor ? (
          <EmptyState
            icon={ClipboardList}
            title={`No ${APPLICATION_STATUS_LABEL[status ?? "SUBMITTED"].toLowerCase()} applications`}
            description="Try another status, or clear the filter to see all of them."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/applications">Show all applications</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No applications yet"
            description="Find a room you like and apply. Screening, viewings and the decision all show up here."
            action={
              <Button asChild>
                <Link href="/rooms">
                  <Search /> Browse rooms
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <DataTable
            caption="Your applications"
            rows={page.items}
            rowKey={(a) => a.id}
            mobileAside={(a) => <StatusBadge status={a.status} label={APPLICATION_STATUS_LABEL[a.status]} />}
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
                hideOnMobile: true,
                cell: (a) => <StatusBadge status={a.status} label={APPLICATION_STATUS_LABEL[a.status]} />,
              },
              { key: "submitted", header: "Submitted", cell: (a) => formatDate(a.submittedAt) },
              {
                key: "updated",
                header: "Last change",
                cell: (a) => formatDate(a.decidedAt ?? a.updatedAt),
              },
            ]}
          />
          <CursorPagination
            basePath="/dashboard/applications"
            searchParams={sp}
            nextCursor={page.nextCursor}
            itemCount={page.items.length}
          />
        </>
      )}
    </div>
  )
}
