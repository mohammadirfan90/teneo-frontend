import { Building2, Plus } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { FilterTabs } from "@/components/shared/filter-tabs"
import { KycCallout } from "@/components/shared/kyc-callout"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { DeletePropertyButton, PublishPropertyButton } from "@/features/properties/property-actions"
import { PROPERTY_TYPE_LABEL } from "@/features/rooms/labels"
import { api, getMe } from "@/lib/api/server"
import { formatDate } from "@/lib/format"
import { oneOf, str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { PropertyView } from "@/types/domain"

export const metadata: Metadata = { title: "Properties" }

const STATUSES = ["PUBLISHED", "DRAFT"] as const

export default async function PropertiesPage(props: PageProps<"/owner/properties">) {
  const sp = await props.searchParams
  const status = oneOf(sp, "status", STATUSES)
  const [me, page] = await Promise.all([
    getMe(),
    api<Page<PropertyView>>("/properties/me", { query: { limit: 50, cursor: str(sp, "cursor") } }),
  ])
  const kyc = me.kycStatus?.owner ?? "NONE"
  // The API has no status filter for /properties/me, so the tab filters the fetched page.
  const rows = status ? page.items.filter((p) => p.status === status) : page.items

  const addButton = (
    <Button asChild>
      <Link href="/owner/properties/new">
        <Plus /> Add property
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Properties"
        description="Everything you list on Teneo. Drafts stay private until you publish them."
        actions={page.items.length > 0 ? addButton : null}
      />

      <KycCallout status={kyc} href="/owner/profile" action="create and publish listings" />

      {page.items.length === 0 && !str(sp, "cursor") ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add the building, its flats and rooms, then upload photos and publish once your identity is verified."
          action={addButton}
        />
      ) : (
        <>
          <FilterTabs
            basePath="/owner/properties"
            searchParams={sp}
            tabs={[
              { value: null, label: "All" },
              { value: "PUBLISHED", label: "Published" },
              { value: "DRAFT", label: "Drafts" },
            ]}
          />
          {rows.length === 0 ? (
            <EmptyState
              compact
              icon={Building2}
              title={status === "DRAFT" ? "No drafts" : "Nothing published yet"}
              description={
                status === "DRAFT"
                  ? "Properties you start but don't publish appear here."
                  : "Publish a draft to make its rooms searchable."
              }
            />
          ) : (
            <DataTable
              caption="Your properties"
              rows={rows}
              rowKey={(p) => p.id}
              mobileAside={(p) => <StatusBadge status={p.status} />}
              columns={[
                {
                  key: "property",
                  header: "Property",
                  cell: (p) => (
                    <div className="min-w-0">
                      <Link href={`/owner/properties/${p.id}`} className="font-medium hover:underline">
                        {p.title}
                      </Link>
                      <p className="text-[0.8125rem] font-normal text-muted-foreground">
                        {PROPERTY_TYPE_LABEL[p.propertyType]} · added {formatDate(p.createdAt)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "location",
                  header: "Location",
                  cell: (p) => [p.area, p.city].filter(Boolean).join(", "),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (p) => <StatusBadge status={p.status} />,
                  hideOnMobile: true,
                },
                {
                  key: "published",
                  header: "Published",
                  cell: (p) => (p.publishedAt ? formatDate(p.publishedAt) : "Not yet"),
                },
              ]}
              actions={(p) => (
                <div className="flex items-center justify-end gap-1.5">
                  {p.status === "DRAFT" && kyc === "APPROVED" && <PublishPropertyButton id={p.id} />}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/owner/properties/${p.id}`}>Manage</Link>
                  </Button>
                  <DeletePropertyButton id={p.id} title={p.title} status={p.status} />
                </div>
              )}
            />
          )}
          <CursorPagination
            basePath="/owner/properties"
            searchParams={sp}
            nextCursor={page.nextCursor}
            itemCount={rows.length}
          />
        </>
      )}
    </div>
  )
}
