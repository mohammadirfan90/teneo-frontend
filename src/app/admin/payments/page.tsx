import { CreditCard, Info, ReceiptText } from "lucide-react"
import type { Metadata } from "next"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { RefundPayment, WaiveInvoice } from "@/features/admin/payment-actions"
import { fetchEach } from "@/features/admin/server"
import type { InvoiceView, PaymentView } from "@/features/admin/types"
import { api } from "@/lib/api/server"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { AuditLogView, InvoiceStatus } from "@/types/domain"

export const metadata: Metadata = { title: "Invoices & refunds" }

const LIMIT = 50
const WAIVABLE: InvoiceStatus[] = ["DUE", "PARTIALLY_PAID", "OVERDUE", "DISPUTED"]

function recentIds(events: AuditLogView[]): string[] {
  const ids: string[] = []
  for (const e of events) {
    if (e.targetEntityId && !ids.includes(e.targetEntityId)) ids.push(e.targetEntityId)
    if (ids.length >= LIMIT) break
  }
  return ids
}

const shortId = (id: string) => id.slice(0, 8)

function period(i: InvoiceView) {
  return `${formatDate(i.periodStart, { year: undefined })} – ${formatDate(i.periodEnd)}`
}

export default async function AdminPaymentsPage() {
  // No admin list endpoint exists: ids come from the newest audit events, then each record is read by id.
  const [invoiceEvents, paymentEvents] = await Promise.all([
    api<Page<AuditLogView>>("/admin/audit-logs", { query: { targetEntityType: "rent_invoice", limit: 100 } }),
    api<Page<AuditLogView>>("/admin/audit-logs", { query: { targetEntityType: "payment", limit: 100 } }),
  ])

  const payments = (
    await fetchEach<PaymentView>(recentIds(paymentEvents.items), (id) => `/payments/${id}`)
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const invoiceIds = recentIds(invoiceEvents.items)
  for (const p of payments) if (!invoiceIds.includes(p.invoiceId)) invoiceIds.push(p.invoiceId)
  const invoices = (await fetchEach<InvoiceView>(invoiceIds, (id) => `/invoices/${id}`)).sort((a, b) =>
    b.generatedAt.localeCompare(a.generatedAt)
  )
  const invoiceById = new Map(invoices.map((i) => [i.id, i]))
  const processing = payments.filter((p) => p.status === "PROCESSING").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Invoices & refunds"
        description="Waive rent that shouldn't be charged and refund card payments."
      />

      <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground sm:p-4">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          The backend has no admin-wide invoice or payment list, so these are the records touched by the most
          recent audit events (up to {LIMIT} of each), read one by one.
        </span>
      </p>

      <section aria-labelledby="invoices" className="flex flex-col gap-3">
        <h2 id="invoices" className="text-lg font-semibold">
          Rent invoices
        </h2>
        {invoices.length === 0 ? (
          <EmptyState
            compact
            icon={ReceiptText}
            title="No invoices yet"
            description="Invoices appear once owners bill an active lease."
          />
        ) : (
          <DataTable
            caption="Rent invoices"
            rows={invoices}
            rowKey={(i) => i.id}
            mobileAside={(i) => <StatusBadge status={i.status} />}
            columns={[
              {
                key: "period",
                header: "Period",
                cell: (i) => (
                  <div className="min-w-0">
                    <p className="font-medium">{period(i)}</p>
                    <p className="font-mono text-xs text-muted-foreground" title={`Lease ${i.leaseId}`}>
                      Lease {shortId(i.leaseId)}
                    </p>
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (i) => <StatusBadge status={i.status} />,
                hideOnMobile: true,
              },
              {
                key: "total",
                header: "Total",
                cell: (i) => formatMoney(i.totalMinor, i.currency),
                align: "right",
              },
              {
                key: "paid",
                header: "Paid",
                cell: (i) => formatMoney(i.amountPaidMinor, i.currency),
                align: "right",
              },
              { key: "due", header: "Due", cell: (i) => formatDate(i.dueDate) },
            ]}
            actions={(i) =>
              WAIVABLE.includes(i.status) ? (
                <WaiveInvoice invoice={i} />
              ) : i.waiveReason ? (
                <span className="text-[0.8125rem] text-muted-foreground" title={i.waiveReason}>
                  Waived {formatDate(i.waivedAt)}
                </span>
              ) : null
            }
          />
        )}
      </section>

      <section aria-labelledby="payments" className="flex flex-col gap-3">
        <div>
          <h2 id="payments" className="text-lg font-semibold">
            Card payments
          </h2>
          <p className="text-sm text-muted-foreground">
            Only succeeded payments can be refunded. A refund is confirmed by Stripe a moment later, so the
            status stays succeeded until then.
            {processing > 0 && ` ${processing} still processing (Stripe never confirmed them).`}
          </p>
        </div>
        {payments.length === 0 ? (
          <EmptyState
            compact
            icon={CreditCard}
            title="No card payments yet"
            description="Payments appear when tenants pay an invoice."
          />
        ) : (
          <DataTable
            caption="Card payments"
            rows={payments}
            rowKey={(p) => p.id}
            mobileAside={(p) => <StatusBadge status={p.status} />}
            columns={[
              {
                key: "amount",
                header: "Amount",
                cell: (p) => (
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">{formatMoney(p.amountMinor, p.currency)}</p>
                    {Number(p.refundedAmountMinor) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(p.refundedAmountMinor, p.currency)} refunded
                      </p>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (p) => <StatusBadge status={p.status} />,
                hideOnMobile: true,
              },
              {
                key: "invoice",
                header: "For invoice",
                cell: (p) => {
                  const inv = invoiceById.get(p.invoiceId)
                  return inv ? period(inv) : <span className="font-mono text-xs">{shortId(p.invoiceId)}</span>
                },
              },
              { key: "started", header: "Started", cell: (p) => formatDateTime(p.createdAt) },
              {
                key: "settled",
                header: "Settled",
                cell: (p) => formatDateTime(p.refundedAt ?? p.paidAt ?? p.failedAt ?? p.canceledAt),
                hideOnMobile: true,
              },
            ]}
            actions={(p) =>
              p.status === "SUCCEEDED" ? (
                <RefundPayment paymentId={p.id} amount={formatMoney(p.amountMinor, p.currency)} />
              ) : null
            }
          />
        )}
      </section>
    </div>
  )
}
