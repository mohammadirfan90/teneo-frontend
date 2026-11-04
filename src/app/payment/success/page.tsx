import { ReceiptText } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { PaymentResult } from "@/features/payments/payment-result"
import { str } from "@/lib/search-params"

export const metadata: Metadata = { title: "Payment status", robots: { index: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PaymentSuccessPage(props: PageProps<"/payment/success">) {
  const sp = await props.searchParams
  const invoiceId = str(sp, "invoice")

  if (!invoiceId || !UUID.test(invoiceId)) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No payment to show"
        description="This link is missing the invoice it belongs to."
        action={
          <Button asChild>
            <Link href="/dashboard/payments">Go to Rent & bills</Link>
          </Button>
        }
      />
    )
  }

  return <PaymentResult invoiceId={invoiceId} redirectStatus={str(sp, "redirect_status")} />
}
