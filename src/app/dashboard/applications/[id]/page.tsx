import { ArrowRight, ChevronLeft, FileSignature, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { ROOM_TYPE_LABEL } from "@/features/rooms/labels"
import { ApplicationStatusPanel } from "@/features/tenant/applications"
import { getRoomContext } from "@/features/tenant/data"
import { api, getMe } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { ApplicationView, LeaseSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Application" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ApplicationDetailPage(props: PageProps<"/dashboard/applications/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const [me, app] = await Promise.all([
    getMe(),
    api<ApplicationView>(`/applications/${id}`).catch((e: unknown) => {
      if (isApiError(e) && (e.status === 404 || e.status === 400)) return null
      throw e
    }),
  ])
  // The API has no party check on this route; only show the tenant their own applications.
  if (!app || app.tenantUserId !== me.id) notFound()

  const [{ room, property }, leases] = await Promise.all([
    getRoomContext(app.roomId),
    app.status === "APPROVED"
      ? api<Page<LeaseSummaryView>>("/leases/me")
      : Promise.resolve<Page<LeaseSummaryView>>({ items: [], nextCursor: null }),
  ])
  const lease = leases.items
    .filter((l) => l.roomId === app.roomId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/dashboard/applications"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All applications
          </Link>
        }
        title={room ? `${room.label}, ${app.property.title}` : app.property.title}
        description={
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {[property?.area, app.property.city].filter(Boolean).join(", ")} · applied{" "}
            {formatDate(app.submittedAt)}
          </span>
        }
      />

      {lease && (
        <section
          aria-label="Lease"
          className="flex flex-col gap-3 rounded-xl border border-success/25 bg-success-soft p-4 sm:flex-row sm:items-center sm:p-5"
        >
          <FileSignature className="size-5 shrink-0 text-success" aria-hidden />
          <div className="flex-1">
            <p className="font-medium">
              {lease.status === "DRAFT" ? "Your lease is ready to sign" : "Your lease for this room"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(lease.startDate)} – {formatDate(lease.endDate)} ·{" "}
              {lease.status === "DRAFT" ? "waiting for signatures" : <StatusBadge status={lease.status} />}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/dashboard/lease/${lease.id}`}>
              {lease.status === "DRAFT" ? "Review and sign" : "Open lease"} <ArrowRight />
            </Link>
          </Button>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <ApplicationStatusPanel app={app} />

          <section aria-labelledby="message-heading" className="rounded-xl border bg-card p-4 sm:p-6">
            <h2 id="message-heading" className="text-lg font-semibold">
              Your message
            </h2>
            {app.message ? (
              <p className="mt-2 max-w-prose leading-relaxed whitespace-pre-line text-muted-foreground">
                {app.message}
              </p>
            ) : (
              <p className="mt-2 text-muted-foreground">You applied without a message.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="room-heading" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="room-heading" className="font-semibold">
              The room
            </h2>
            {room ? (
              <>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="font-medium">{ROOM_TYPE_LABEL[room.roomType]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Rent</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(room.baseRentMinor, room.currency)}/mo
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deposit</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(room.depositMinor, room.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Listing</dt>
                    <dd>
                      <StatusBadge status={room.status} />
                    </dd>
                  </div>
                </dl>
                {room.status === "PUBLISHED" ? (
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href={`/rooms/${room.id}`}>
                      View listing <ArrowRight />
                    </Link>
                  </Button>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    This room is no longer listed publicly
                    {room.status === "RESERVED" || room.status === "OCCUPIED"
                      ? " because it has been let"
                      : ""}
                    .
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Room details are no longer available.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
