import { ChevronLeft, Star } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cn } from "cn"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { getProperty, getRoom, getTenantNames } from "@/features/owner/data"
import { CATEGORY_LABEL, SLA_HOURS, shortId } from "@/features/owner/labels"
import { PriorityLabel, SlaIndicator } from "@/features/owner/tickets/sla"
import { TicketCommentForm, TicketStatusControl } from "@/features/owner/tickets/ticket-actions"
import type { TicketDetail } from "@/features/owner/types"
import { isApiError } from "@/lib/api/errors"
import { api, getMe } from "@/lib/api/server"
import { formatDate, formatDateTime } from "@/lib/format"

export const metadata: Metadata = { title: "Maintenance ticket" }

async function getTicket(id: string): Promise<TicketDetail> {
  try {
    return await api<TicketDetail>(`/tickets/${id}`)
  } catch (e) {
    if (isApiError(e) && [400, 403, 404].includes(e.status)) notFound()
    throw e
  }
}

export default async function OwnerTicketPage(props: PageProps<"/owner/tickets/[id]">) {
  const { id } = await props.params
  const [{ ticket, updates }, me, names] = await Promise.all([getTicket(id), getMe(), getTenantNames()])
  const room = await getRoom(ticket.roomId)
  const property = room ? await getProperty(room.propertyId) : null
  const closed = ticket.status === "CLOSED" || ticket.status === "CANCELLED"

  const author = (uid: string) => (uid === me.id ? "You" : (names.get(uid) ?? "Tenant"))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/owner/tickets"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Maintenance
          </Link>
        }
        title={ticket.title}
        description={
          <>
            {CATEGORY_LABEL[ticket.category]} · {room?.label ?? `Room ${shortId(ticket.roomId)}`}
            {property ? ` · ${property.title}` : ""}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="thread"
          className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5"
        >
          <h2 id="thread" className="text-base font-semibold">
            Conversation
          </h2>
          <ol className="flex flex-col gap-4">
            {updates.map((u, i) => {
              const mine = u.authorUserId === me.id
              return (
                <li key={u.id} className={cn("flex flex-col gap-1.5", mine && "sm:items-end")}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
                    <span className="font-medium text-foreground">{author(u.authorUserId)}</span>
                    <span className="tabular-nums">{formatDateTime(u.createdAt)}</span>
                    {i === 0 && <span>· reported the issue</span>}
                  </div>
                  <div
                    className={cn(
                      "max-w-prose rounded-lg px-3.5 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-line",
                      mine ? "bg-primary/6" : "bg-surface-2"
                    )}
                  >
                    {u.body}
                  </div>
                  {u.statusAfter && (
                    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-muted-foreground">
                      Moved to <StatusBadge status={u.statusAfter} />
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
          {!closed ? (
            <div className="border-t pt-4">
              <TicketCommentForm ticketId={ticket.id} />
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">
              This ticket is closed to new replies.
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <section aria-label="Status" className="rounded-xl border bg-card p-4 sm:p-5">
            <TicketStatusControl
              key={`${ticket.status}-${ticket.updatedAt}`}
              ticketId={ticket.id}
              status={ticket.status}
            />
          </section>

          <section aria-labelledby="details" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="details" className="text-base font-semibold">
              Details
            </h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Priority</dt>
                <dd>
                  <PriorityLabel priority={ticket.priority} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Response target</dt>
                <dd className="text-right">
                  <SlaIndicator
                    target={ticket.slaTargetAt}
                    breachedAt={ticket.slaBreachedAt}
                    status={ticket.status}
                    showRelative
                  />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Target window</dt>
                <dd>{SLA_HOURS[ticket.priority]} hours from report</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Reported</dt>
                <dd>{formatDate(ticket.createdAt)}</dd>
              </div>
              {ticket.resolvedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Resolved</dt>
                  <dd>{formatDateTime(ticket.resolvedAt)}</dd>
                </div>
              )}
              {ticket.closedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Closed</dt>
                  <dd>{formatDateTime(ticket.closedAt)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Lease</dt>
                <dd>
                  <Link href={`/owner/leases/${ticket.leaseId}`} className="font-medium hover:underline">
                    View lease
                  </Link>
                </dd>
              </div>
            </dl>
            {ticket.rating !== null && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-muted-foreground">Tenant rating</p>
                <p className="mt-1 flex items-center gap-0.5" aria-label={`${ticket.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      aria-hidden
                      className={cn(
                        "size-4",
                        i < (ticket.rating ?? 0) ? "fill-clay text-clay" : "text-border"
                      )}
                    />
                  ))}
                </p>
                {ticket.ratingComment && <p className="mt-2 text-sm">{ticket.ratingComment}</p>}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
