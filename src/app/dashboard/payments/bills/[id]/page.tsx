import { ChevronLeft } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import type { BillShareView, UtilityBillView } from "@/features/tenant/types"
import { api, getMe } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format"

export const metadata: Metadata = { title: "Utility bill" }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function BillDetailPage(props: PageProps<"/dashboard/payments/bills/[id]">) {
  const { id } = await props.params
  if (!UUID.test(id)) notFound()
  const [me, data] = await Promise.all([
    getMe(),
    api<{ bill: UtilityBillView; shares: BillShareView[] }>(`/bills/${id}`).catch((e: unknown) => {
      if (isApiError(e) && (e.status === 404 || e.status === 403)) return null
      throw e
    }),
  ])
  if (!data) notFound()
  const { bill, shares } = data
  const mine = shares.find((s) => s.tenantUserId === me.id)

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
        title={`Utility bill, ${formatDate(bill.periodStart)} – ${formatDate(bill.periodEnd)}`}
        description={bill.superseded ? "This bill was replaced by a newer calculation." : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="usage-heading" className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 id="usage-heading" className="text-lg font-semibold">
            Usage
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <dt className="text-sm text-muted-foreground">Previous reading</dt>
              <dd className="font-medium tabular-nums">{Number(bill.previousReadingValue)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Current reading</dt>
              <dd className="font-medium tabular-nums">{Number(bill.currentReadingValue)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Units used</dt>
              <dd className="font-medium tabular-nums">{Number(bill.consumptionUnits)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Bill total</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(bill.totalAmountMinor, bill.currency)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted-foreground">Calculated {formatDateTime(bill.generatedAt)}.</p>
        </section>

        <section aria-labelledby="shares-heading" className="rounded-xl border bg-card p-4 sm:p-6">
          <h2 id="shares-heading" className="text-lg font-semibold">
            How it&apos;s split
          </h2>
          {mine && (
            <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">
              {formatMoney(mine.shareMinor, bill.currency)}
              <span className="ml-2 text-base font-normal text-muted-foreground">your share</span>
            </p>
          )}
          <ul className="mt-4 flex flex-col divide-y text-sm">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                <span>{s.tenantUserId === me.id ? "You" : "Housemate"}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatMoney(s.shareMinor, bill.currency)} · {humanize(s.splitMode)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Your share is included in the rent invoice for this period.
          </p>
        </section>
      </div>
    </div>
  )
}
