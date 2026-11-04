import { BedDouble, ChevronLeft, MessageSquareText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { cache } from "react"

import { StatusBadge } from "@/components/shared/status-badge"
import { getMyProperties, getRoom } from "@/features/owner/data"
import { ApplicationActions } from "@/features/owner/applications/application-actions"
import { ROOM_TYPE_LABEL, leaseRange } from "@/features/rooms/labels"
import { isApiError } from "@/lib/api/errors"
import { api } from "@/lib/api/server"
import { formatDate, formatDateTime, formatMoney, initials } from "@/lib/format"
import type { Page } from "@/types/api"
import type { ApplicationView, LeaseSummaryView } from "@/types/domain"

const getApplication = cache(async (id: string): Promise<ApplicationView | null> => {
  try {
    return await api<ApplicationView>(`/applications/${id}`)
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 400)) return null
    throw e
  }
})

export async function generateMetadata(props: PageProps<"/owner/applications/[id]">): Promise<Metadata> {
  const { id } = await props.params
  const application = await getApplication(id)
  return { title: application ? `${application.tenant.displayName} · application` : "Application" }
}

export default async function ApplicationDetailPage(props: PageProps<"/owner/applications/[id]">) {
  const { id } = await props.params
  const [application, mine] = await Promise.all([getApplication(id), getMyProperties()])
  // GET /applications/:id has no party check, so make sure it's on one of our properties.
  if (!application || !mine.items.some((p) => p.id === application.property.id)) notFound()

  const [room, leases] = await Promise.all([
    getRoom(application.roomId),
    application.status === "APPROVED"
      ? api<Page<LeaseSummaryView>>("/leases/me")
      : Promise.resolve({ items: [], nextCursor: null } as Page<LeaseSummaryView>),
  ])
  const lease =
    leases.items
      .filter((l) => l.roomId === application.roomId && l.role === "OWNER")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  const terms = room ? leaseRange(room.minLeaseMonths, room.maxLeaseMonths) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <Link
          href="/owner/applications"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Applications
        </Link>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold text-primary"
          >
            {initials(application.tenant.displayName)}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{application.tenant.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              Applied {formatDateTime(application.submittedAt)} for {application.property.title}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 flex flex-col gap-6 lg:order-1">
          <section aria-labelledby="message" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="message" className="flex items-center gap-2 font-semibold">
              <MessageSquareText className="size-4 text-subtle" aria-hidden /> Message from the applicant
            </h2>
            {application.message ? (
              <p className="mt-3 max-w-prose leading-relaxed whitespace-pre-line">{application.message}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                The applicant didn&apos;t include a message.
              </p>
            )}
          </section>

          <section aria-labelledby="room" className="rounded-xl border bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 id="room" className="flex items-center gap-2 font-semibold">
                <BedDouble className="size-4 text-subtle" aria-hidden /> {room?.label ?? "Room"}
              </h2>
              {room && <StatusBadge status={room.status} />}
            </div>
            {room ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Rent</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatMoney(room.baseRentMinor, room.currency)}/month
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Deposit</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">
                    {formatMoney(room.depositMinor, room.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="mt-0.5 font-medium">{ROOM_TYPE_LABEL[room.roomType]}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Available</dt>
                  <dd className="mt-0.5 font-medium">
                    {room.availableFrom ? formatDate(room.availableFrom) : "Now"}
                  </dd>
                </div>
                {terms && (
                  <div>
                    <dt className="text-muted-foreground">Lease length</dt>
                    <dd className="mt-0.5 font-medium">{terms}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Property</dt>
                  <dd className="mt-0.5 font-medium">
                    <Link href={`/owner/properties/${application.property.id}`} className="hover:underline">
                      {application.property.title}
                    </Link>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">This room is no longer available.</p>
            )}
          </section>

          <section aria-labelledby="timeline" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="timeline" className="font-semibold">
              Timeline
            </h2>
            <ol className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex justify-between gap-3">
                <span>Submitted</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDateTime(application.submittedAt)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Last change</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDateTime(application.updatedAt)}
                </span>
              </li>
              {application.decidedAt &&
                ["APPROVED", "REJECTED", "WITHDRAWN", "CANCELLED"].includes(application.status) && (
                  <li className="flex justify-between gap-3">
                    <span>Decided</span>
                    <span className="text-muted-foreground tabular-nums">
                      {formatDateTime(application.decidedAt)}
                    </span>
                  </li>
                )}
            </ol>
          </section>
        </div>

        <div className="order-1 lg:sticky lg:top-24 lg:order-2 lg:self-start">
          <ApplicationActions
            key={`${application.status}-${application.version}`}
            application={application}
            leaseId={lease?.id ?? null}
          />
        </div>
      </div>
    </div>
  )
}
