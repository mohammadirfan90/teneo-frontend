import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { KycPanelSkeleton } from "@/features/kyc/kyc-panel"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading profile">
      <PageHeaderSkeleton withAction={false} />
      <KycPanelSkeleton />
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}
