import { BadgeCheck, ScrollText, Users, Wrench } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatCard } from "@/components/shared/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api/server"
import { countLabel } from "@/lib/counts"
import { formatDateTime, humanize } from "@/lib/format"
import type { Page } from "@/types/api"
import {
  OPEN_TICKET_STATUSES,
  type AuditLogView,
  type KycSubmissionView,
  type TicketSummaryView,
  type UserSearchHit,
} from "@/types/domain"

export const metadata: Metadata = { title: "Admin overview" }

export default async function AdminOverviewPage() {
  const [kyc, tickets, users, audit] = await Promise.all([
    api<Page<KycSubmissionView>>("/kyc/queue", { query: { limit: 100 } }),
    api<Page<TicketSummaryView>>("/tickets/queue", { query: { limit: "100" } }),
    api<Page<UserSearchHit>>("/admin/users/search", { query: { q: "@", limit: 50 } }),
    api<Page<AuditLogView>>("/admin/audit-logs", { query: { limit: 8 } }),
  ])

  const openTickets = tickets.items.filter((t) => OPEN_TICKET_STATUSES.includes(t.status))
  const breached = openTickets.filter((t) => t.slaBreachedAt).length
  const flagged = kyc.items.filter((s) => s.flaggedForReview).length

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
        <StatCard label="Registered users" value={countLabel(users)} icon={Users} href="/admin/users" />
        <StatCard
          label="Latest activity"
          value={audit.items[0] ? humanize(audit.items[0].action.replace(/\./g, "_")) : "None"}
          hint={audit.items[0] ? formatDateTime(audit.items[0].occurredAt) : undefined}
          icon={ScrollText}
          href="/admin/audit"
        />
      </section>

      <section aria-labelledby="activity" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="activity" className="text-lg font-semibold">
            Recent activity
          </h2>
          <Button variant="link" asChild>
            <Link href="/admin/audit">Open audit log</Link>
          </Button>
        </div>
        {audit.items.length === 0 ? (
          <EmptyState compact icon={ScrollText} title="No activity recorded yet" />
        ) : (
          <DataTable
            caption="Recent audit events"
            rows={audit.items}
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
              { key: "target", header: "Target", cell: (e) => humanize(e.targetEntityType) },
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
