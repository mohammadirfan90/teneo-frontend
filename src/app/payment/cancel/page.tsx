import { CircleSlash } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ResultCard } from "@/features/payments/result-card"
import { str } from "@/lib/search-params"

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PaymentCancelPage(props: PageProps<"/payment/cancel">) {
  const sp = await props.searchParams
  const invoice = str(sp, "invoice")
  const valid = invoice && UUID.test(invoice)

  return (
    <ResultCard
      icon={CircleSlash}
      tone="info"
      title="Payment cancelled"
      body="Nothing was charged to your card. The invoice is still open whenever you're ready."
    >
      <div className="flex flex-wrap gap-2">
        {valid && (
          <Button asChild>
            <Link href={`/dashboard/payments/${invoice}/pay`}>Try again</Link>
          </Button>
        )}
        <Button asChild variant={valid ? "ghost" : "default"}>
          <Link href="/dashboard/payments">Back to Rent & bills</Link>
        </Button>
      </div>
    </ResultCard>
  )
}
