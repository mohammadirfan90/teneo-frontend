import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { KycPanelSkeleton } from "@/features/kyc/kyc-panel"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      <KycPanelSkeleton />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
