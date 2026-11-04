import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { PayFormSkeleton } from "@/features/payments/pay-form"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading payment">
      <Skeleton className="h-4 w-24" />
      <PageHeaderSkeleton withAction={false} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="order-2 rounded-xl border bg-card p-4 sm:p-6 lg:order-1">
          <Skeleton className="mb-4 h-6 w-36" />
          <PayFormSkeleton />
        </div>
        <Skeleton className="order-1 h-56 rounded-xl lg:order-2" />
      </div>
    </div>
  )
}
