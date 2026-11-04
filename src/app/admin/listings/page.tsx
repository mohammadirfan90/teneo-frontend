import { Building2, Info, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { ReinstateListing, TakedownListing } from "@/features/admin/listing-actions"
import { allLiveRooms, fetchEach } from "@/features/admin/server"
import { api } from "@/lib/api/server"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { AuditLogView, PropertyView } from "@/types/domain"

export const metadata: Metadata = { title: "Listings" }

interface LiveProperty {
  id: string
  title: string
  city: string
  area: string | null
  owner: string
  rooms: number
  minRent: number
  maxRent: number
  currency: string
  publishedAt: string | null
}

export default async function AdminListingsPage() {
  const [rooms, moderation] = await Promise.all([
    allLiveRooms(),
    api<Page<AuditLogView>>("/admin/audit-logs", {
      query: { action: "admin.listing", targetEntityType: "property", limit: 100 },
    }),
  ])

  // Live inventory grouped by property (search only returns PUBLISHED rooms on PUBLISHED properties).
  const byProperty = new Map<string, LiveProperty>()
  for (const r of rooms.items) {
    const rent = Number(r.baseRentMinor)
    const p = byProperty.get(r.property.id)
    if (p) {
      p.rooms += 1
      p.minRent = Math.min(p.minRent, rent)
      p.maxRent = Math.max(p.maxRent, rent)
    } else {
      byProperty.set(r.property.id, {
        id: r.property.id,
        title: r.property.title,
        city: r.property.city,
        area: r.property.area,
        owner: r.owner.displayName,
        rooms: 1,
        minRent: rent,
        maxRent: rent,
        currency: r.currency,
        publishedAt: r.property.publishedAt,
      })
    }
  }

  // Latest moderation event per property decides whether it is still down (events arrive newest first).
  const latest = new Map<string, AuditLogView>()
  const takedownAt = new Map<string, string>()
  for (const e of moderation.items) {
    if (!e.targetEntityId) continue
    if (!latest.has(e.targetEntityId)) latest.set(e.targetEntityId, e)
    if (e.action.includes("takedown") && !takedownAt.has(e.targetEntityId))
      takedownAt.set(e.targetEntityId, e.occurredAt)
  }
  const history = [...latest.values()].filter((e) => takedownAt.has(e.targetEntityId ?? "")).slice(0, 20)
  // Taken-down properties are soft-deleted, so GET /properties/:id 404s for them; reinstated ones resolve.
  const props = await fetchEach<PropertyView>(
    history.map((e) => e.targetEntityId ?? ""),
    (id) => `/properties/${id}`
  )
  const titles = new Map(props.map((p) => [p.id, p.title]))
  // Search is cached for ~2 minutes, so a property taken down moments ago can still be in it:
  // borrow its title, and keep it out of the live list.
  for (const [id, p] of byProperty) if (!titles.has(id)) titles.set(id, p.title)
  const isDown = (id: string) => latest.get(id)?.action.includes("takedown") ?? false
  const live = [...byProperty.values()].filter((p) => !isDown(p.id))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Listings"
        description="Every property that is live in search right now, and the ones staff have taken down."
      />

      <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground sm:p-4">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Tenants can&apos;t report listings yet; the backend has no reports feed. This list comes from public
          search, so draft properties and rooms that are reserved, occupied or under maintenance don&apos;t
          appear.
        </span>
      </p>

      <section aria-labelledby="live" className="flex flex-col gap-3">
        <div>
          <h2 id="live" className="text-lg font-semibold">
            Live properties
          </h2>
          <p className="text-sm text-muted-foreground">
            {live.length} {live.length === 1 ? "property" : "properties"} with{" "}
            {live.reduce((n, p) => n + p.rooms, 0)}
            {rooms.complete ? "" : "+"} rooms open to applications.
          </p>
        </div>
        {live.length === 0 ? (
          <EmptyState
            compact
            icon={Building2}
            title="Nothing is live in search"
            description="Properties appear here once an owner publishes them."
          />
        ) : (
          <DataTable
            caption="Live properties"
            rows={live}
            rowKey={(p) => p.id}
            columns={[
              {
                key: "title",
                header: "Property",
                cell: (p) => (
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-[0.8125rem] text-muted-foreground">
                      {[p.area, p.city].filter(Boolean).join(", ")}
                    </p>
                  </div>
                ),
              },
              { key: "owner", header: "Owner", cell: (p) => p.owner },
              { key: "rooms", header: "Live rooms", cell: (p) => p.rooms, align: "right" },
              {
                key: "rent",
                header: "Rent",
                cell: (p) =>
                  p.minRent === p.maxRent
                    ? formatMoney(p.minRent, p.currency)
                    : `${formatMoney(p.minRent, p.currency)}–${formatMoney(p.maxRent, p.currency)}`,
                align: "right",
              },
              {
                key: "published",
                header: "Published",
                cell: (p) => formatDate(p.publishedAt),
                hideOnMobile: true,
              },
            ]}
            actions={(p) => <TakedownListing propertyId={p.id} title={p.title} />}
          />
        )}
      </section>

      <section aria-labelledby="down" className="flex flex-col gap-3">
        <div>
          <h2 id="down" className="text-lg font-semibold">
            Recently taken down
          </h2>
          <p className="text-sm text-muted-foreground">
            From the audit log. While a property is down the API hides it, so its title may show only after it
            is reinstated.
          </p>
        </div>
        {history.length === 0 ? (
          <EmptyState compact icon={ShieldCheck} title="No listings have been taken down" />
        ) : (
          <DataTable
            caption="Moderated properties"
            rows={history}
            rowKey={(e) => e.id}
            mobileAside={(e) => (
              <StatusBadge
                status={e.action.includes("takedown") ? "TAKEN_DOWN" : "PUBLISHED"}
                label={e.action.includes("takedown") ? "Taken down" : "Reinstated"}
              />
            )}
            columns={[
              {
                key: "property",
                header: "Property",
                cell: (e) => {
                  const title = titles.get(e.targetEntityId ?? "")
                  return title ? (
                    <span className="font-medium">{title}</span>
                  ) : (
                    <Link
                      href={`/admin/audit?entity=property&target=${e.targetEntityId}`}
                      className="font-mono text-[0.8125rem] underline-offset-4 hover:underline"
                    >
                      {e.targetEntityId}
                    </Link>
                  )
                },
              },
              {
                key: "status",
                header: "Now",
                cell: (e) => (
                  <StatusBadge
                    status={e.action.includes("takedown") ? "TAKEN_DOWN" : "PUBLISHED"}
                    label={e.action.includes("takedown") ? "Taken down" : "Reinstated"}
                  />
                ),
                hideOnMobile: true,
              },
              {
                key: "down",
                header: "Taken down",
                cell: (e) => formatDateTime(takedownAt.get(e.targetEntityId ?? "")),
              },
              {
                key: "last",
                header: "Last change",
                cell: (e) => formatDateTime(e.occurredAt),
                hideOnMobile: true,
              },
            ]}
            actions={(e) =>
              e.action.includes("takedown") && e.targetEntityId ? (
                <ReinstateListing propertyId={e.targetEntityId} />
              ) : null
            }
          />
        )}
      </section>
    </div>
  )
}
