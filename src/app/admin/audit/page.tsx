import { Download, Info, ScrollText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuditFilters } from "@/features/admin/audit-filters"
import { ACTOR_ROLES, ENTITY_TYPES, entityLabel } from "@/features/admin/labels"
import { api } from "@/lib/api/server"
import { formatDateTime, humanize } from "@/lib/format"
import { oneOf, str, type RawSearchParams } from "@/lib/search-params"
import type { Page } from "@/types/api"
import type { AuditLogView } from "@/types/domain"

export const metadata: Metadata = { title: "Audit log" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** URL filters → backend query (dates become whole UTC days, inclusive). */
function toBackendQuery(sp: RawSearchParams) {
  const from = str(sp, "from")
  const to = str(sp, "to")
  const actor = str(sp, "actor")
  const target = str(sp, "target")
  return {
    action: str(sp, "action")?.slice(0, 64),
    targetEntityType: oneOf(sp, "entity", ENTITY_TYPES),
    actorUserId: actor && UUID.test(actor) ? actor : undefined,
    targetEntityId: target && UUID.test(target) ? target : undefined,
    from: from && DATE.test(from) ? `${from}T00:00:00.000Z` : undefined,
    to: to && DATE.test(to) ? `${to}T23:59:59.999Z` : undefined,
  }
}

export default async function AdminAuditPage(props: PageProps<"/admin/audit">) {
  const sp: RawSearchParams = await props.searchParams
  const filters = toBackendQuery(sp)
  const role = oneOf(sp, "role", ACTOR_ROLES)
  // The backend's cursor ignores from/to, so a date-bounded view is one capped page.
  const dated = Boolean(filters.from || filters.to)

  const page = await api<Page<AuditLogView>>("/admin/audit-logs", {
    query: { ...filters, limit: dated ? 100 : 25, cursor: dated ? undefined : str(sp, "cursor") },
  })
  const rows = role
    ? page.items.filter((e) =>
        role === "SYSTEM" ? !e.actorRole || e.actorRole === "SYSTEM" : e.actorRole === role
      )
    : page.items

  const exportQs = new URLSearchParams({ format: "csv" })
  for (const [k, v] of Object.entries(filters)) if (v) exportQs.set(k, v)
  const filtered = Object.values(filters).some(Boolean) || Boolean(role)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        description="Every recorded change on the platform, newest first. Sign-ins, sign-ups and account deactivations aren't recorded by the backend."
        actions={
          <Button variant="outline" asChild>
            <a href={`/api/proxy/admin/audit-logs?${exportQs.toString()}`} download>
              <Download /> Export CSV
            </a>
          </Button>
        }
      />

      <Suspense fallback={<Skeleton className="h-[116px] rounded-xl" />}>
        <AuditFilters />
      </Suspense>

      {(dated || role) && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {dated &&
              `With a date range the log shows the newest ${page.items.length}${page.nextCursor ? " (capped at 100)" : ""} matching events on one page; export the CSV for all of them. `}
            {role && "The actor filter narrows the loaded events and isn't applied to the CSV export."}
          </span>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtered ? "No events match these filters" : "Nothing recorded yet"}
          description={filtered ? "Widen the date range or clear a filter." : undefined}
          action={
            filtered ? (
              <Button variant="outline" asChild>
                <Link href="/admin/audit">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          caption="Audit events"
          rows={rows}
          rowKey={(e) => e.id}
          mobileTitle={(e) => <span className="font-mono text-[0.8125rem] break-all">{e.action}</span>}
          mobileAside={(e) => (
            <Badge variant="neutral">{e.actorRole ? humanize(e.actorRole) : "System"}</Badge>
          )}
          columns={[
            {
              key: "action",
              header: "Action",
              cell: (e) => <span className="font-mono text-[0.8125rem]">{e.action}</span>,
              hideOnMobile: true,
            },
            {
              key: "target",
              header: "Target",
              cell: (e) =>
                e.targetEntityId ? (
                  <Link
                    href={`/admin/audit?target=${e.targetEntityId}`}
                    className="underline-offset-4 hover:underline"
                    title={e.targetEntityId}
                  >
                    {entityLabel(e.targetEntityType)}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.targetEntityId.slice(0, 8)}
                    </span>
                  </Link>
                ) : (
                  entityLabel(e.targetEntityType)
                ),
            },
            {
              key: "actor",
              header: "Actor",
              cell: (e) =>
                e.actorUserId ? (
                  <Link href={`/admin/users/${e.actorUserId}`} className="underline-offset-4 hover:underline">
                    {e.actorRole ? humanize(e.actorRole) : "User"}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.actorUserId.slice(0, 8)}
                    </span>
                  </Link>
                ) : (
                  "System"
                ),
              hideOnMobile: true,
            },
            { key: "when", header: "When", cell: (e) => formatDateTime(e.occurredAt) },
            {
              key: "ip",
              header: "IP",
              cell: (e) => <span className="font-mono text-xs">{e.ipAddress ?? "—"}</span>,
              hideOnMobile: true,
            },
          ]}
        />
      )}

      {!dated && (
        <CursorPagination
          basePath="/admin/audit"
          searchParams={sp}
          nextCursor={page.nextCursor}
          itemCount={rows.length}
        />
      )}
    </div>
  )
}
