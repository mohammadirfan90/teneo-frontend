import { ChevronLeft, PenLine } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { getProperty, getRoom, getTenantNames } from "@/features/owner/data"
import { shortId } from "@/features/owner/labels"
import { Amendments } from "@/features/owner/leases/amendments"
import { LeaseActions } from "@/features/owner/leases/lease-actions"
import type { LeaseView } from "@/features/owner/types"
import { ROOM_TYPE_LABEL } from "@/features/rooms/labels"
import { isApiError } from "@/lib/api/errors"
import { api } from "@/lib/api/server"
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format"

export const metadata: Metadata = { title: "Lease" }

async function getLease(id: string): Promise<LeaseView> {
  try {
    return await api<LeaseView>(`/leases/${id}`)
  } catch (e) {
    if (isApiError(e) && [400, 403, 404].includes(e.status)) notFound()
    throw e
  }
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default async function OwnerLeasePage(props: PageProps<"/owner/leases/[id]">) {
  const { id } = await props.params
  const lease = await getLease(id)
  const [room, names] = await Promise.all([getRoom(lease.roomId), getTenantNames()])
  const property = room ? await getProperty(room.propertyId) : null

  const ownerSig = lease.signatures.find((s) => s.signerRole === "OWNER") ?? null
  const tenantName = (uid: string) => names.get(uid) ?? "Tenant"
  const title = room?.label ?? `Room ${shortId(lease.roomId)}`

  const timeline = [
    { at: lease.createdAt, label: "Draft created from the approved application" },
    ...lease.signatures.map((s) => ({
      at: s.signedAt,
      label: s.signerRole === "OWNER" ? "You signed" : `${tenantName(s.signerUserId)} signed`,
    })),
    ...(lease.activatedAt
      ? [{ at: lease.activatedAt, label: "Tenant confirmed move-in — lease active" }]
      : []),
    ...(lease.endedAt ? [{ at: lease.endedAt, label: `Lease ${humanize(lease.status).toLowerCase()}` }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/owner/leases"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Leases
          </Link>
        }
        title={title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge status={lease.status} />
            <span>
              {property ? `${property.title} · ` : ""}
              {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[auto_1fr]">
        <div className="flex min-w-0 flex-col gap-6 lg:row-span-2">
          <section aria-labelledby="terms" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="terms" className="text-base font-semibold">
              Terms
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Term label="Monthly rent" value={formatMoney(lease.rentMinor, lease.currency)} />
              <Term label="Deposit" value={formatMoney(lease.depositMinor, lease.currency)} />
              <Term label="Utility split" value={humanize(lease.utilitySplitMode)} />
              <Term label="Starts" value={formatDate(lease.startDate)} />
              <Term label="Ends" value={formatDate(lease.endDate)} />
              {room && <Term label="Room type" value={ROOM_TYPE_LABEL[room.roomType]} />}
            </dl>
            {property && (
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                <Link
                  href={`/owner/properties/${property.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {property.title}
                </Link>
                {" · "}
                {property.addressLine1}, {[property.area, property.city].filter(Boolean).join(", ")}
              </p>
            )}
          </section>

          <section aria-labelledby="parties" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="parties" className="text-base font-semibold">
              Tenants
            </h2>
            <ul className="mt-3 divide-y">
              {lease.tenants.map((t) => {
                const signed = lease.signatures.find((s) => s.signerUserId === t.tenantUserId)
                return (
                  <li
                    key={t.tenantUserId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <p className="font-medium">{tenantName(t.tenantUserId)}</p>
                      <p className="text-[0.8125rem] text-muted-foreground">
                        {t.isPrimary ? "Primary tenant" : "Co-tenant"} · {Number(t.liabilityShare)}% of rent
                      </p>
                    </div>
                    {signed ? (
                      <StatusBadge status="SIGNED" label={`Signed ${formatDate(signed.signedAt)}`} />
                    ) : (
                      <StatusBadge status="PENDING" label="Not signed" />
                    )}
                  </li>
                )
              })}
            </ul>
          </section>

          <Amendments
            leaseId={lease.id}
            currency={lease.currency}
            canPropose={lease.status !== "TERMINATED" && lease.status !== "ENDED"}
          />
        </div>

        <section
          aria-labelledby="actions"
          className="rounded-xl border bg-card p-4 max-lg:order-first sm:p-5 lg:col-start-2 lg:row-start-1"
        >
          <h2 id="actions" className="mb-3 text-base font-semibold">
            Next step
          </h2>
          <LeaseActions leaseId={lease.id} status={lease.status} ownerSignedAt={ownerSig?.signedAt ?? null} />
        </section>

        <section
          aria-labelledby="history"
          className="rounded-xl border bg-card p-4 sm:p-5 lg:col-start-2 lg:row-start-2 lg:self-start"
        >
          <h2 id="history" className="text-base font-semibold">
            History
          </h2>
          <ol className="mt-3 flex flex-col gap-3">
            {timeline.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex gap-3">
                <PenLine className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
                <div>
                  <p className="text-sm">{e.label}</p>
                  <p className="text-[0.8125rem] text-muted-foreground tabular-nums">
                    {formatDateTime(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t pt-3 text-[0.8125rem] text-subtle">
            A downloadable contract isn&apos;t available yet — the service doesn&apos;t generate lease
            documents.
          </p>
        </section>
      </div>
    </div>
  )
}
