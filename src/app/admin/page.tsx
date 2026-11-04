import { Activity, BadgeCheck, ScrollText, Users, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { Suspense } from "react"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityChart, BreakdownChart, type ActivityDay } from "@/features/admin/charts"
import {
  ACTIVITY_GROUPS,
  ACTIVITY_RANGES,
  DEFAULT_RANGE,
  activityGroupOf,
  entityLabel,
} from "@/features/admin/labels"
import { RangeToggle } from "@/features/admin/range-toggle"
import { allUsers, auditRows } from "@/features/admin/server"
import { api } from "@/lib/api/server"
import { countLabel } from "@/lib/counts"
import { formatDateTime, humanize } from "@/lib/format"
import { str } from "@/lib/search-params"
import type { Page } from "@/types/api"
import {
  OPEN_TICKET_STATUSES,
  type AuditLogView,
  type KycSubmissionView,
  type TicketSummaryView,
} from "@/types/domain"

export const metadata: Metadata = { title: "Admin overview" }

const DAY = 86_400_000
const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })

/** Start of the current UTC day. Called after `connection()`, so it runs per request. */
function utcDayStart(): number {
  return Math.floor(Date.now() / DAY) * DAY
}

/** One bucket per UTC day in the window, oldest first, families counted from targetEntityType. */
function bucketByDay(rows: AuditLogView[], startMs: number, days: number): ActivityDay[] {
  const buckets: ActivityDay[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(startMs + i * DAY)
    return {
      day: d.toISOString().slice(0, 10),
      label: dayLabel.format(d),
      listings: 0,
      rentals: 0,
      billing: 0,
      support: 0,
    }
  })
  const index = new Map(buckets.map((b, i) => [b.day, i]))
  for (const r of rows) {
    const i = index.get(r.occurredAt.slice(0, 10))
    if (i === undefined) continue
    const bucket = buckets[i]
    if (bucket) bucket[activityGroupOf(r.targetEntityType)] += 1
  }
  return buckets
}

export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  const sp = await props.searchParams
  const requested = Number(str(sp, "days"))
  const days = (ACTIVITY_RANGES as readonly number[]).includes(requested) ? requested : DEFAULT_RANGE

  await connection()
  const todayStart = utcDayStart()
  const startMs = todayStart - (days - 1) * DAY

  const [kyc, tickets, users, recent, windowRows] = await Promise.all([
    api<Page<KycSubmissionView>>("/kyc/queue", { query: { limit: 100 } }),
    api<Page<TicketSummaryView>>("/tickets/queue", { query: { limit: "100" } }),
    allUsers(),
    api<Page<AuditLogView>>("/admin/audit-logs", { query: { limit: 8 } }),
    auditRows({ from: new Date(startMs).toISOString() }),
  ])

  const openTickets = tickets.items.filter((t) => OPEN_TICKET_STATUSES.includes(t.status))
  const breached = openTickets.filter((t) => t.slaBreachedAt).length
  const flagged = kyc.items.filter((s) => s.flaggedForReview).length

  const activity = bucketByDay(windowRows, startMs, days)
  const totalEvents = windowRows.length
  const groupTotals = ACTIVITY_GROUPS.map((g) => ({
    ...g,
    total: activity.reduce((sum, d) => sum + d[g.key], 0),
  }))

  const userCount = users.complete ? String(users.items.length) : `${users.items.length}+`
  const roleRows = [
    { label: "Tenants", count: users.items.filter((u) => u.roles.includes("TENANT")).length },
    { label: "Owners", count: users.items.filter((u) => u.roles.includes("OWNER")).length },
    { label: "Admins", count: users.items.filter((u) => u.roles.includes("ADMIN")).length },
    { label: "No role", count: users.items.filter((u) => u.roles.length === 0).length },
  ].filter((r) => r.label !== "No role" || r.count > 0)
  const verified = users.items.filter((u) => u.kycStatus === "APPROVED").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Overview"
        description="Verification queue, platform activity and anything waiting on staff."
        actions={
          kyc.items.length > 0 ? (
            <Button asChild>
              <Link href="/admin/kyc">
                <BadgeCheck /> Review KYC
              </Link>
            </Button>
          ) : null
        }
      />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="KYC awaiting review"
          value={countLabel(kyc)}
          hint={flagged ? `${flagged} flagged as reused documents` : "Oldest first in the queue"}
          icon={BadgeCheck}
          href="/admin/kyc"
        />
        <StatCard
          label="Open maintenance"
          value={countLabel(tickets, openTickets.length)}
          hint={breached ? `${breached} past response target` : "None past target"}
          icon={Wrench}
        />
        <StatCard
          label="Active accounts"
          value={userCount}
          hint="Deactivated accounts excluded"
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          label={`Events, last ${days} days`}
          value={totalEvents.toLocaleString("en-US")}
          hint="Recorded in the audit log"
          icon={Activity}
          href="/admin/audit"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="activity-chart"
          className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="activity-chart" className="font-semibold">
                Platform activity
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Events per day over the last {days} days (UTC), from the audit log, grouped by what they
                touched.
              </p>
            </div>
            <Suspense fallback={<Skeleton className="h-8 w-48" />}>
              <RangeToggle />
            </Suspense>
          </div>
          {totalEvents === 0 ? (
            <EmptyState
              compact
              icon={Activity}
              title={`No recorded activity in the last ${days} days`}
              description="Applications, leases, payments, tickets and moderation actions appear here as they happen."
            />
          ) : (
            <>
              <ActivityChart data={activity} />
              <details className="group text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Show as table
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left tabular-nums">
                    <caption className="sr-only">Audit events per day by family</caption>
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-medium">Day</th>
                        {ACTIVITY_GROUPS.map((g) => (
                          <th key={g.key} className="py-2 pr-3 text-right font-medium">
                            {g.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activity
                        .filter((d) => ACTIVITY_GROUPS.some((g) => d[g.key] > 0))
                        .map((d) => (
                          <tr key={d.day} className="border-b last:border-0">
                            <td className="py-2 pr-3">{d.label}</td>
                            {ACTIVITY_GROUPS.map((g) => (
                              <td key={g.key} className="py-2 pr-3 text-right">
                                {d[g.key]}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Families:{" "}
                    {groupTotals
                      .map(
                        (g) => `${g.label} (${g.types.map((t) => entityLabel(t).toLowerCase()).join(", ")})`
                      )
                      .join("; ")}
                    .
                  </p>
                </div>
              </details>
            </>
          )}
        </section>

        <section
          aria-labelledby="accounts-chart"
          className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
        >
          <div>
            <h2 id="accounts-chart" className="font-semibold">
              Accounts by role
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              From user search, {users.complete ? "all" : "the first"} {users.items.length} active accounts.
              An account can hold more than one role.
            </p>
          </div>
          {users.items.length === 0 ? (
            <EmptyState compact icon={Users} title="No accounts yet" />
          ) : (
            <>
              <BreakdownChart data={roleRows} />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">{verified}</span> of{" "}
                {users.items.length} have an approved KYC profile.
              </p>
            </>
          )}
        </section>
      </div>

      <section aria-labelledby="activity" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="activity" className="text-lg font-semibold">
            Recent activity
          </h2>
          <Button variant="link" asChild>
            <Link href="/admin/audit">Open audit log</Link>
          </Button>
        </div>
        {recent.items.length === 0 ? (
          <EmptyState compact icon={ScrollText} title="No activity recorded yet" />
        ) : (
          <DataTable
            caption="Recent audit events"
            rows={recent.items}
            rowKey={(e) => e.id}
            mobileAside={(e) =>
              e.actorRole ? <Badge variant="neutral">{humanize(e.actorRole)}</Badge> : null
            }
            columns={[
              {
                key: "action",
                header: "Action",
                cell: (e) => <span className="font-mono text-[0.8125rem]">{e.action}</span>,
              },
              { key: "target", header: "Target", cell: (e) => entityLabel(e.targetEntityType) },
              {
                key: "actor",
                header: "Actor",
                cell: (e) => (e.actorRole ? humanize(e.actorRole) : "System"),
                hideOnMobile: true,
              },
              { key: "when", header: "When", cell: (e) => formatDateTime(e.occurredAt) },
            ]}
          />
        )}
      </section>
    </div>
  )
}
