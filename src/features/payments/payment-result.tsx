"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleCheck, CircleX, Hourglass, RefreshCw } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"
import type { Page } from "@/types/api"
import type { PaymentSummaryView } from "@/types/domain"
import type { InvoiceView } from "@/features/tenant/types"
import { ResultCard, ResultSkeleton } from "./result-card"

const POLL_MS = 2000
const MAX_POLLS = 30 // ≈ 60 s

interface Status {
  invoice: InvoiceView
  payment: PaymentSummaryView | null
}

async function fetchStatus(invoiceId: string): Promise<Status> {
  const [invoice, payments] = await Promise.all([
    apiClient.get<InvoiceView>(`/invoices/${invoiceId}`),
    apiClient.get<Page<PaymentSummaryView>>("/payments/me"),
  ])
  const forInvoice = payments.items.filter((p) => p.invoiceId === invoiceId)
  const payment =
    forInvoice
      .filter((p) => p.status === "SUCCEEDED")
      .sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""))[0] ??
    forInvoice[0] ??
    null
  return { invoice, payment }
}

/**
 * After Stripe redirects back: poll the invoice until the webhook marks it PAID (or ~60 s pass),
 * then show a receipt. Stripe's own redirect_status short-circuits a failed attempt.
 */
export function PaymentResult({ invoiceId, redirectStatus }: { invoiceId: string; redirectStatus?: string }) {
  const failed = redirectStatus === "failed"
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: ["payment-status", invoiceId],
    queryFn: () => fetchStatus(invoiceId),
    enabled: !failed,
    staleTime: 0,
    retry: 1,
    refetchInterval: (q) =>
      q.state.data?.invoice.status === "PAID" || q.state.dataUpdateCount >= MAX_POLLS ? false : POLL_MS,
  })

  if (failed) {
    return (
      <ResultCard
        icon={CircleX}
        tone="danger"
        title="Your payment didn't go through"
        body="Your bank or Stripe declined it. You haven't been charged."
      >
        <Button asChild>
          <Link href={`/dashboard/payments/${invoiceId}/pay`}>Try again</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/dashboard/payments">Rent & bills</Link>
        </Button>
      </ResultCard>
    )
  }

  if (status.isPending) return <ResultSkeleton />

  if (status.isError) {
    return (
      <ResultCard
        icon={CircleX}
        tone="danger"
        title="We couldn't check this payment"
        body={
          isApiError(status.error) && status.error.status === 404
            ? "That invoice doesn't exist or isn't yours."
            : "Check your connection, then try again. If you paid, it will still be recorded."
        }
      >
        <Button onClick={() => void status.refetch()}>
          <RefreshCw /> Try again
        </Button>
      </ResultCard>
    )
  }

  const { invoice, payment } = status.data
  const paidOut = invoice.status === "PAID"
  const polls = queryClient.getQueryState(["payment-status", invoiceId])?.dataUpdateCount ?? 0
  const timedOut = !paidOut && polls >= MAX_POLLS

  if (!paidOut) {
    return (
      <ResultCard
        icon={Hourglass}
        tone="info"
        title={timedOut ? "Still processing" : "Confirming your payment…"}
        body={
          timedOut
            ? "Stripe accepted the card, but the invoice hasn't been marked as paid yet. This usually catches up within a few minutes. Don't pay again."
            : "Waiting for Stripe to confirm. This takes a few seconds."
        }
        live
      >
        {timedOut && (
          <Button variant="outline" onClick={() => void status.refetch()} loading={status.isFetching}>
            <RefreshCw /> Check again
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/dashboard/payments">Rent & bills</Link>
        </Button>
      </ResultCard>
    )
  }

  const amount = payment?.status === "SUCCEEDED" ? payment.amountMinor : invoice.amountPaidMinor
  return (
    <ResultCard
      icon={CircleCheck}
      tone="success"
      title="Payment received"
      body="Thanks. Your invoice is paid."
      live
    >
      <dl className="w-full divide-y rounded-lg border text-sm">
        <ReceiptRow label="Amount" value={formatMoney(amount, invoice.currency)} />
        <ReceiptRow
          label="For"
          value={`Rent ${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
        />
        <ReceiptRow
          label="Paid"
          value={payment?.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(invoice.updatedAt)}
        />
        <ReceiptRow label="Method" value="Card, via Stripe" />
        {payment && <ReceiptRow label="Payment reference" value={payment.id} mono />}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/payments">Back to Rent & bills</Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          Print receipt
        </Button>
      </div>
    </ResultCard>
  )
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs break-all" : "font-medium tabular-nums"}>{value}</dd>
    </div>
  )
}
