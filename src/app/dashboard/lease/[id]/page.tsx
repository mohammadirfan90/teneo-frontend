import { ChevronLeft, FileText, MapPin } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { AmendmentsPanel } from "@/features/tenant/amendments"
import { getRoomContext } from "@/features/tenant/data"
import { LeaseActions } from "@/features/tenant/lease-actions"
import { PAYABLE_INVOICE_STATUSES, type LeaseView } from "@/features/tenant/types"
import { api, getMe } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format"
import type { Page } from "@/types/api"
import type { InvoiceSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Lease" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getDocumentUrl(id: string): Promise<string | null> {
  try {
    const doc = await api<{ url: string; expiresAt: string }>(`/leases/${id}/document`)
    // The backend currently returns a stub ("mock://signed-url/<id>"); only real links are shown.
    return /^https:\/\//.test(doc.url) ? doc.url : null
  } catch {
    return null
  }
}

function Term({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default async function LeaseDetailPage(props: PageProps<"/dashboard/lease/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()

  const [me, lease] = await Promise.all([
    getMe(),
    api<LeaseView>(`/leases/${id}`).catch((e: unknown) => {
      if (isApiError(e) && (e.status === 404 || e.status === 403 || e.status === 400)) return null
      throw e
    }),
  ])
  if (!lease) notFound()

  const [{ room, property }, documentUrl, invoices] = await Promise.all([
    getRoomContext(lease.roomId),
    getDocumentUrl(lease.id),
    api<Page<InvoiceSummaryView>>("/invoices/me"),
  ])
  const leaseInvoices = invoices.items.filter((i) => i.leaseId === lease.id)
  const mine = lease.tenants.find((t) => t.tenantUserId === me.id)
  const ownerSig = lease.signatures.find((s) => s.signerRole === "OWNER")
  const mySig = lease.signatures.find((s) => s.signerUserId === me.id)
  const open = lease.status !== "ENDED" && lease.status !== "TERMINATED"

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/dashboard/lease"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All leases
          </Link>
        }
        title={room ? `${room.label}${property ? `, ${property.title}` : ""}` : "Lease"}
        description={
          property ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {[property.addressLine1, property.area, property.city].filter(Boolean).join(", ")}
            </span>
          ) : undefined
        }
        actions={<StatusBadge status={lease.status} />}
      />

      <LeaseActions lease={lease} meId={me.id} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="terms-heading" className="rounded-xl border bg-card p-4 sm:p-6">
            <h2 id="terms-heading" className="text-lg font-semibold">
              Terms
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Term label="Monthly rent" value={formatMoney(lease.rentMinor, lease.currency)} />
              <Term label="Deposit" value={formatMoney(lease.depositMinor, lease.currency)} />
              <Term label="Currency" value={lease.currency} />
              <Term label="Starts" value={formatDate(lease.startDate)} />
              <Term label="Ends" value={formatDate(lease.endDate)} />
              <Term label="Utilities split" value={humanize(lease.utilitySplitMode)} />
              {mine && <Term label="Your share of rent" value={`${Number(mine.liabilityShare)}%`} />}
              <Term
                label="Tenants on lease"
                value={lease.tenants.length === 1 ? "Just you" : `${lease.tenants.length} people`}
              />
            </dl>
          </section>

          <section aria-labelledby="invoices-heading" className="rounded-xl border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="invoices-heading" className="text-lg font-semibold">
                Rent invoices
              </h2>
              <Button asChild variant="link">
                <Link href="/dashboard/payments">Rent & bills</Link>
              </Button>
            </div>
            {leaseInvoices.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {lease.status === "ACTIVE"
                  ? "No invoices yet. The owner issues one for each rent period."
                  : "Invoices start once the lease is active."}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col divide-y">
                {leaseInvoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium">
                        {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {formatMoney(inv.totalMinor, inv.currency)} · due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} />
                      {PAYABLE_INVOICE_STATUSES.includes(inv.status) && (
                        <Button asChild size="sm">
                          <Link href={`/dashboard/payments/${inv.id}/pay`}>Pay</Link>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AmendmentsPanel leaseId={lease.id} meId={me.id} currency={lease.currency} canPropose={open} />
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="sig-heading" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="sig-heading" className="font-semibold">
              Signatures
            </h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span>Owner</span>
                <span className="text-muted-foreground">
                  {ownerSig ? `Signed ${formatDate(ownerSig.signedAt)}` : "Not signed yet"}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>You</span>
                <span className="text-muted-foreground">
                  {mySig ? `Signed ${formatDate(mySig.signedAt)}` : "Not signed yet"}
                </span>
              </li>
            </ul>
            <dl className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Drafted</dt>
                <dd>{formatDate(lease.createdAt)}</dd>
              </div>
              {lease.signedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Fully signed</dt>
                  <dd>{formatDateTime(lease.signedAt)}</dd>
                </div>
              )}
              {lease.activatedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Moved in</dt>
                  <dd>{formatDate(lease.activatedAt)}</dd>
                </div>
              )}
              {lease.endedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {lease.status === "TERMINATED" ? "Terminated" : "Ended"}
                  </dt>
                  <dd>{formatDate(lease.endedAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="doc-heading" className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 id="doc-heading" className="font-semibold">
              Lease document
            </h2>
            {documentUrl ? (
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                  <FileText /> Download signed PDF
                </a>
              </Button>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
                Signed PDF not available yet. The terms on this page are the agreed record.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
