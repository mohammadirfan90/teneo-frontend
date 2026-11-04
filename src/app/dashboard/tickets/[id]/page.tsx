import { ChevronLeft, Star } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { getRoomContext } from "@/features/tenant/data"
import { CATEGORY_LABEL, PRIORITY_LABEL } from "@/features/tenant/labels"
import { TicketWorkspace } from "@/features/tenant/tickets"
import type { LeaseView, TicketDetail } from "@/features/tenant/types"
import { api, getMe } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Maintenance request" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TicketDetailPage(props: PageProps<"/dashboard/tickets/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const [me, detail] = await Promise.all([
    getMe(),
    api<TicketDetail>(`/tickets/${id}`).catch((e: unknown) => {
      if (isApiError(e) && (e.status === 404 || e.status === 403)) return null
      throw e
    }),
  ])
  if (!detail) notFound()
  const { ticket, updates } = detail

  const [lease, ctx] = await Promise.all([
    api<LeaseView>(`/leases/${ticket.leaseId}`).catch(() => null),
    getRoomContext(ticket.roomId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/dashboard/tickets"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All requests
          </Link>
        }
        title={ticket.title}
        description={[
          ctx.room ? `${ctx.room.label}${ctx.property ? `, ${ctx.property.title}` : ""}` : null,
          CATEGORY_LABEL[ticket.category],
          `${PRIORITY_LABEL[ticket.priority]} urgency`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <TicketWorkspace
          key={`${ticket.status}:${ticket.updatedAt}`}
          ticket={ticket}
          updates={updates}
          meId={me.id}
          ownerId={lease?.ownerUserId ?? null}
        />

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="report-heading" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="report-heading" className="font-semibold">
              Original report
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed whitespace-pre-line text-muted-foreground">
              {ticket.description}
            </p>
            <dl className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reported</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reply expected by</dt>
                <dd className={ticket.slaBreachedAt ? "text-destructive" : undefined}>
                  {formatDateTime(ticket.slaTargetAt)}
                </dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Resolved</dt>
                  <dd>{formatDate(ticket.resolvedAt)}</dd>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Closed</dt>
                  <dd>{formatDate(ticket.closedAt)}</dd>
                </div>
              )}
            </dl>
            {ticket.slaBreachedAt && (
              <p className="mt-3 text-sm text-destructive">The owner replied after the expected time.</p>
            )}
          </section>

          {ticket.rating !== null && (
            <section aria-labelledby="rating-heading" className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 id="rating-heading" className="font-semibold">
                Your rating
              </h2>
              <p className="mt-2 flex items-center gap-1" aria-label={`${ticket.rating} out of 5 stars`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    aria-hidden
                    className={
                      n <= (ticket.rating ?? 0) ? "size-5 fill-clay text-clay" : "size-5 text-subtle"
                    }
                  />
                ))}
              </p>
              {ticket.ratingComment && (
                <p className="mt-2 text-sm text-muted-foreground">“{ticket.ratingComment}”</p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
