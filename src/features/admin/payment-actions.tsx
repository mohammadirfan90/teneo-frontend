"use client"

import { useMutation } from "@tanstack/react-query"
import { HandCoins, Undo2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ReasonDialog } from "@/components/shared/reason-dialog"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { formatMoney } from "@/lib/format"
import type { InvoiceView, RefundResult } from "./types"

function describe(e: unknown): string {
  if (!isApiError(e)) return "Couldn't reach the server. Try again."
  if (e.status === 409) return "Its status changed since this page loaded. Refresh to see the latest."
  if (e.status === 503) return "Card payments aren't configured on the server, so refunds can't be sent."
  if (e.status === 404) return "This record no longer exists."
  return e.userMessage
}

const REASON = { label: "Reason", max: 1000, description: "Saved on the record and in the audit trail." }

export function WaiveInvoice({ invoice }: { invoice: InvoiceView }) {
  const router = useRouter()
  const waive = useMutation({
    meta: { silent: true },
    mutationFn: (reason: string) => apiClient.post<InvoiceView>(`/invoices/${invoice.id}/waive`, { reason }),
    onSuccess: () => {
      toast.success("Invoice waived", { description: "The tenant no longer owes this amount." })
      router.refresh()
    },
  })
  const balance = Number(invoice.totalMinor) - Number(invoice.amountPaidMinor)

  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="outline">
          <HandCoins /> Waive
        </Button>
      }
      title="Waive this invoice?"
      description={`The remaining ${formatMoney(balance, invoice.currency)} is written off and the invoice closes. This can't be undone.`}
      confirmLabel="Waive invoice"
      destructive
      reason={{ ...REASON, placeholder: "Water outage for the first week of the period." }}
      onConfirm={(reason) => waive.mutateAsync(reason)}
      describeError={describe}
    />
  )
}

export function RefundPayment({ paymentId, amount }: { paymentId: string; amount: string }) {
  const router = useRouter()
  const refund = useMutation({
    meta: { silent: true },
    mutationFn: (reason: string) => apiClient.post<RefundResult>(`/payments/${paymentId}/refund`, { reason }),
    onSuccess: () => {
      toast.success("Refund requested", {
        description: "Stripe is processing it. The status changes to refunded when Stripe confirms.",
      })
      router.refresh()
    },
  })

  return (
    <ReasonDialog
      trigger={
        <Button size="sm" variant="outline">
          <Undo2 /> Refund
        </Button>
      }
      title={`Refund ${amount}?`}
      description="The full amount goes back to the tenant's card through Stripe and the invoice reopens. The payment shows as refunded once Stripe confirms, usually within a minute."
      confirmLabel="Request refund"
      destructive
      reason={{ ...REASON, placeholder: "Charged twice for November." }}
      onConfirm={(reason) => refund.mutateAsync(reason)}
      describeError={describe}
    />
  )
}
