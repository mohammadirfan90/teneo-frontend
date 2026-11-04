import { ClipboardList } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterTabs } from "@/components/shared/filter-tabs"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import { oneOf, str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { ApplicationStatus, ApplicationView } from "@/types/domain"

export const metadata: Metadata = { title: "Applications" }

const STATUSES = [
  "SUBMITTED",
  "SCREENING",
  "VIEWING_SCHEDULED",
  "SHORTLISTED",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
  "CANCELLED",
] as const satisfies readonly ApplicationStatus[]

const TAB_LABEL: Record<(typeof STATUSES)[number], string> = {
  SUBMITTED: "New",
  SCREENING: "Screening",
  VIEWING_SCHEDULED: "Viewing",
  SHORTLISTED: "Shortlisted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  CANCELLED: "Cancelled",
}

const CLOSED: ApplicationStatus[] = ["APPROVED", "REJECTED", "WITHDRAWN", "CANCELLED"]

export default async function ApplicationsPage(props: PageProps<"/owner/applications">) {
  const sp = await props.searchParams
  const status = oneOf(sp, "status", STATUSES)
  const page = await api<Page<ApplicationView>>("/applications", {
    query: { status, cursor: str(sp, "cursor"), limit: 20 },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        description="Tenants applying for your rooms. Screen them, offer viewings, then approve one to draft a lease."
      />
      <FilterTabs
        basePath="/owner/applications"
        searchParams={sp}
        tabs={[{ value: null, label: "All" }, ...STATUSES.map((s) => ({ value: s, label: TAB_LABEL[s] }))]}
      />

      {page.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={status ? `No ${TAB_LABEL[status].toLowerCase()} applications` : "No applications yet"}
          description={
            status
              ? "Try another status, or check back when tenants apply."
              : "When tenants apply for one of your published rooms, their application appears here."
          }
          action={
            status ? (
              <Button variant="outline" asChild>
                <Link href="/owner/applications">Show all applications</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/owner/properties">Review your listings</Link>
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          caption="Applications"
          rows={page.items}
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
            {
              key: "property",
              header: "Property",
              cell: (a) => (
                <span>
                  {a.property.title}
                  <span className="text-muted-foreground"> · {a.property.city}</span>
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (a) => <StatusBadge status={a.status} />,
              hideOnMobile: true,
            },
            { key: "submitted", header: "Submitted", cell: (a) => formatDate(a.submittedAt) },
            {
              key: "decided",
              header: "Decided",
              cell: (a) => (a.decidedAt && CLOSED.includes(a.status) ? formatDate(a.decidedAt) : "—"),
              hideOnMobile: true,
            },
          ]}
          actions={(a) => (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/owner/applications/${a.id}`}>Review</Link>
            </Button>
          )}
        />
      )}
      <CursorPagination
        basePath="/owner/applications"
        searchParams={sp}
        nextCursor={page.nextCursor}
        itemCount={page.items.length}
      />
    </div>
  )
}
