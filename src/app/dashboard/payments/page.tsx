import { CreditCard, Gauge, History, ReceiptText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  INVOICE_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  UTILITY_LABEL,
  balanceMinor,
  shortId,
} from "@/features/payments/labels"
import { getRoomContexts } from "@/features/tenant/data"
import { PAYABLE_INVOICE_STATUSES, type BillSummaryView } from "@/features/tenant/types"
import { api } from "@/lib/api/server"
import { formatDate, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { InvoiceSummaryView, LeaseSummaryView, PaymentSummaryView } from "@/types/domain"

export const metadata: Metadata = { title: "Rent & bills" }

function period(a: string, b: string) {
  return `${formatDate(a)} – ${formatDate(b)}`
}

export default async function PaymentsPage() {
  // /invoices/me: first page only. Its cursor is broken upstream (can leak other parties' invoices).
  const [invoices, bills, payments, leases] = await Promise.all([
    api<Page<InvoiceSummaryView>>("/invoices/me"),
    api<Page<BillSummaryView>>("/bills/me", { query: { limit: "20" } }),
    api<Page<PaymentSummaryView>>("/payments/me"),
    api<Page<LeaseSummaryView>>("/leases/me"),
  ])
  const leaseRoom = new Map(leases.items.map((l) => [l.id, l.roomId]))
  const rooms = await getRoomContexts(
    [...new Set(invoices.items.map((i) => leaseRoom.get(i.leaseId)))].filter((id): id is string =>
      Boolean(id)
    )
  )
  const roomLabel = (leaseId: string) => {
    const ctx = rooms.get(leaseRoom.get(leaseId) ?? "")
    return ctx?.room ? (ctx.property ? `${ctx.room.label}, ${ctx.property.title}` : ctx.room.label) : "Lease"
  }
  const invoiceById = new Map(invoices.items.map((i) => [i.id, i]))

  const unpaid = invoices.items
    .filter((i) => PAYABLE_INVOICE_STATUSES.includes(i.status))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const next = unpaid[0]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Rent & bills"
        description="Invoices from your owner, utility bills and what you've paid."
      />

      {next ? (
        <section
          aria-label="Next payment"
          className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div>
            <p className="text-sm text-muted-foreground">
              {unpaid.length > 1 ? `Next of ${unpaid.length} unpaid invoices` : "Next payment"} ·{" "}
              {roomLabel(next.leaseId)}
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(balanceMinor(next), next.currency)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Rent for {period(next.periodStart, next.periodEnd)} · due {formatDate(next.dueDate)}
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={`/dashboard/payments/${next.id}/pay`}>
              <CreditCard /> Pay now
            </Link>
          </Button>
        </section>
      ) : invoices.items.length > 0 ? (
        <section
          aria-label="Next payment"
          className="rounded-xl border border-success/25 bg-success-soft p-4 text-[0.9375rem] sm:p-5"
        >
          You&apos;re all paid up. New invoices appear here when your owner issues them.
        </section>
      ) : null}

      <section aria-labelledby="invoices-heading" className="flex flex-col gap-3">
        <h2 id="invoices-heading" className="text-lg font-semibold">
          Rent invoices
        </h2>
        {invoices.items.length === 0 ? (
          <EmptyState
            compact
            icon={ReceiptText}
            title="No invoices yet"
            description="Once your lease is active, your owner issues an invoice for each rent period."
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard/lease">View my lease</Link>
              </Button>
            }
          />
        ) : (
          <>
            <DataTable
              caption="Rent invoices"
              rows={invoices.items}
              rowKey={(i) => i.id}
              mobileTitle={(i) => period(i.periodStart, i.periodEnd)}
              mobileAside={(i) => <StatusBadge status={i.status} label={INVOICE_STATUS_LABEL[i.status]} />}
              columns={[
                {
                  key: "period",
                  header: "Period",
                  hideOnMobile: true,
                  cell: (i) => <span className="font-medium">{period(i.periodStart, i.periodEnd)}</span>,
                },
                {
                  key: "room",
                  header: "Room",
                  cell: (i) => <span className="block max-w-56 truncate">{roomLabel(i.leaseId)}</span>,
                },
                {
                  key: "total",
                  header: "Amount",
                  align: "right",
                  cell: (i) => formatMoney(i.totalMinor, i.currency),
                },
                {
                  key: "balance",
                  header: "Balance",
                  align: "right",
                  cell: (i) => formatMoney(balanceMinor(i), i.currency),
                },
                { key: "due", header: "Due", cell: (i) => formatDate(i.dueDate) },
                {
                  key: "status",
                  header: "Status",
                  hideOnMobile: true,
                  cell: (i) => <StatusBadge status={i.status} label={INVOICE_STATUS_LABEL[i.status]} />,
                },
              ]}
              actions={(i) =>
                PAYABLE_INVOICE_STATUSES.includes(i.status) ? (
                  <Button asChild size="sm">
                    <Link href={`/dashboard/payments/${i.id}/pay`}>Pay</Link>
                  </Button>
                ) : i.status === "PAID" ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/payment/success?invoice=${i.id}`}>Receipt</Link>
                  </Button>
                ) : null
              }
            />
            {invoices.nextCursor && (
              <p className="text-sm text-muted-foreground">Showing your 20 most recent invoices.</p>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="bills-heading" className="flex flex-col gap-3">
        <h2 id="bills-heading" className="text-lg font-semibold">
          Utility bills
        </h2>
        {bills.items.length === 0 ? (
          <EmptyState
            compact
            icon={Gauge}
            title="No utility bills"
            description="Metered utilities like electricity or water show up here once your owner records readings. Your share is added to the rent invoice."
          />
        ) : (
          <DataTable
            caption="Utility bills"
            rows={bills.items}
            rowKey={(b) => b.id}
            columns={[
              {
                key: "utility",
                header: "Utility",
                cell: (b) => (
                  <Link href={`/dashboard/payments/bills/${b.id}`} className="font-medium hover:underline">
                    {UTILITY_LABEL[b.meterUtilityType]} · {b.meterLabel}
                  </Link>
                ),
              },
              { key: "period", header: "Period", cell: (b) => period(b.periodStart, b.periodEnd) },
              {
                key: "amount",
                header: "Total",
                align: "right",
                cell: (b) => formatMoney(b.totalAmountMinor, b.currency),
              },
              {
                key: "state",
                header: "Note",
                cell: (b) => (b.superseded ? "Replaced by a newer bill" : "Current"),
              },
            ]}
          />
        )}
      </section>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="history-heading" className="text-lg font-semibold">
            Payment history
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Card payments you started. Ones you didn&apos;t finish stay as “not completed”; you weren&apos;t
            charged.
          </p>
        </div>
        {payments.items.length === 0 ? (
          <EmptyState
            compact
            icon={History}
            title="No payments yet"
            description="Payments you make by card are listed here with their receipts."
          />
        ) : (
          <DataTable
            caption="Payment history"
            rows={payments.items}
            rowKey={(p) => p.id}
            mobileAside={(p) => <StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} />}
            columns={[
              {
                key: "date",
                header: "Date",
                cell: (p) => <span className="font-medium">{formatDate(p.paidAt ?? p.createdAt)}</span>,
              },
              {
                key: "invoice",
                header: "For",
                cell: (p) => {
                  const inv = invoiceById.get(p.invoiceId)
                  return inv
                    ? `Rent ${period(inv.periodStart, inv.periodEnd)}`
                    : `Invoice ${shortId(p.invoiceId)}`
                },
              },
              {
                key: "amount",
                header: "Amount",
                align: "right",
                cell: (p) => formatMoney(p.amountMinor, p.currency),
              },
              {
                key: "status",
                header: "Status",
                hideOnMobile: true,
                cell: (p) => <StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} />,
              },
              {
                key: "ref",
                header: "Reference",
                hideOnMobile: true,
                cell: (p) => <span className="font-mono text-xs text-muted-foreground">{shortId(p.id)}</span>,
              },
            ]}
          />
        )}
      </section>
    </div>
  )
}
