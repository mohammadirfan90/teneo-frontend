import { ArrowRight, FileSignature, Search } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { getRoomContexts } from "@/features/tenant/data"
import { api } from "@/lib/api/server"
import { formatDate, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { LeaseStatus, LeaseSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "My lease" }

const NEXT_STEP: Record<LeaseStatus, string> = {
  DRAFT: "Needs signatures",
  SIGNED: "Confirm your move-in",
  ACTIVE: "Active",
  ENDED: "Ended",
  TERMINATED: "Terminated",
}

const ORDER: Record<LeaseStatus, number> = { DRAFT: 0, SIGNED: 1, ACTIVE: 2, ENDED: 3, TERMINATED: 4 }

export default async function LeasesPage() {
  const page = await api<Page<LeaseSummaryView>>("/leases/me")
  const leases = page.items
    .filter((l) => l.role === "TENANT")
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt))
  const rooms = await getRoomContexts(leases.map((l) => l.roomId))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={leases.length > 1 ? "My leases" : "My lease"}
        description="Signing, move-in and the terms you agreed to."
      />

      {leases.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No lease yet"
          description="When an owner approves your application, a draft lease appears here for you to sign."
          action={
            <Button asChild>
              <Link href="/dashboard/applications">See your applications</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {leases.map((l) => {
            const ctx = rooms.get(l.roomId)
            const needsAction = l.status === "DRAFT" || l.status === "SIGNED"
            return (
              <li key={l.id}>
                <Link
                  href={`/dashboard/lease/${l.id}`}
                  className="group flex h-full flex-col gap-4 rounded-xl border bg-card p-4 transition-colors duration-150 hover:border-input sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold group-hover:underline">
                        {ctx?.room?.label ?? "Room"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {ctx?.property
                          ? [ctx.property.title, ctx.property.area ?? ctx.property.city].join(" · ")
                          : "Property details unavailable"}
                      </p>
                    </div>
                    <StatusBadge status={l.status} label={NEXT_STEP[l.status]} />
                  </div>
                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Rent</dt>
                      <dd className="font-medium tabular-nums">{formatMoney(l.rentMinor, l.currency)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Starts</dt>
                      <dd className="font-medium">{formatDate(l.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Ends</dt>
                      <dd className="font-medium">{formatDate(l.endDate)}</dd>
                    </div>
                  </dl>
                  <span
                    className={`mt-auto inline-flex items-center gap-1 text-sm font-medium ${needsAction ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {l.status === "DRAFT"
                      ? "Review and sign"
                      : l.status === "SIGNED"
                        ? "Confirm move-in"
                        : "Open lease"}
                    <ArrowRight className="size-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {leases.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Looking for another place?{" "}
          <Link
            href="/rooms"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Search className="size-3.5" aria-hidden /> Browse rooms
          </Link>
        </p>
      )}
    </div>
  )
}
