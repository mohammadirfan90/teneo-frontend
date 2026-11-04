import { ChevronLeft, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { INVOICE_STATUS_LABEL, balanceMinor } from "@/features/payments/labels"
import { PayForm } from "@/features/payments/pay-form"
import { getRoomContext } from "@/features/tenant/data"
import { PAYABLE_INVOICE_STATUSES, type InvoiceView, type LeaseView } from "@/features/tenant/types"
import { api } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatMoney } from "@/lib/format"

export const metadata: Metadata = { title: "Pay rent" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "border-t pt-3 font-semibold" : ""}`}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

export default async function PayInvoicePage(props: PageProps<"/dashboard/payments/[invoiceId]/pay">) {
  const { invoiceId } = await props.params
  if (!UUID.test(invoiceId)) notFound()
  const invoice = await api<InvoiceView>(`/invoices/${invoiceId}`).catch((e: unknown) => {
    if (isApiError(e) && (e.status === 404 || e.status === 403)) return null
    throw e
  })
  if (!invoice) notFound()

  const lease = await api<LeaseView>(`/leases/${invoice.leaseId}`).catch(() => null)
  const ctx = lease ? await getRoomContext(lease.roomId) : null
  const payable = PAYABLE_INVOICE_STATUSES.includes(invoice.status)
  const paid = Number(invoice.amountPaidMinor)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          <Link
            href="/dashboard/payments"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Rent & bills
          </Link>
        }
        title="Pay rent"
        description={
          ctx?.room
            ? `${ctx.room.label}${ctx.property ? `, ${ctx.property.title}` : ""} · ${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`
            : `${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          aria-labelledby="card-heading"
          className="order-2 rounded-xl border bg-card p-4 sm:p-6 lg:order-1"
        >
          <h2 id="card-heading" className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="size-5 text-success" aria-hidden /> Card details
          </h2>
          {payable ? (
            <PayForm invoiceId={invoice.id} totalMinor={invoice.totalMinor} currency={invoice.currency} />
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-[0.9375rem]">
                {invoice.status === "PAID"
                  ? "This invoice is already paid."
                  : "This invoice was waived by an admin, so there's nothing to pay."}
              </p>
              <div className="flex flex-wrap gap-2">
                {invoice.status === "PAID" && (
                  <Button asChild>
                    <Link href={`/payment/success?invoice=${invoice.id}`}>View receipt</Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link href="/dashboard/payments">Back to Rent & bills</Link>
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside
          aria-labelledby="summary-heading"
          className="order-1 rounded-xl border bg-card p-4 sm:p-5 lg:sticky lg:top-24 lg:order-2 lg:self-start"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="summary-heading" className="font-semibold">
              Invoice
            </h2>
            <StatusBadge status={invoice.status} label={INVOICE_STATUS_LABEL[invoice.status]} />
          </div>
          <dl className="mt-4 flex flex-col gap-2.5 text-sm">
            <Row label="Rent" value={formatMoney(invoice.baseRentMinor, invoice.currency)} />
            {Number(invoice.utilityShareMinor) > 0 && (
              <Row label="Utilities" value={formatMoney(invoice.utilityShareMinor, invoice.currency)} />
            )}
            {Number(invoice.lateFeeMinor) > 0 && (
              <Row label="Late fee" value={formatMoney(invoice.lateFeeMinor, invoice.currency)} />
            )}
            {paid > 0 && <Row label="Already paid" value={formatMoney(paid, invoice.currency)} />}
            <Row label="Total" value={formatMoney(invoice.totalMinor, invoice.currency)} strong />
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
          {payable && paid > 0 && (
            <p className="mt-3 rounded-lg bg-warning-soft p-3 text-sm">
              Card payments always charge the full invoice total, not the remaining{" "}
              {formatMoney(balanceMinor(invoice), invoice.currency)}. Contact your owner before paying again.
            </p>
          )}
          {invoice.status === "DISPUTED" && invoice.disputeReason && (
            <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
              You disputed this invoice: “{invoice.disputeReason}”. Paying settles it.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
