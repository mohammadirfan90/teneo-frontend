import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading rent and bills">
      <PageHeaderSkeleton withAction={false} />
      <div className="flex items-center justify-between rounded-xl border bg-card p-4 sm:p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="hidden h-11 w-28 sm:block" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <TableSkeleton rows={4} cols={6} />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <TableSkeleton rows={3} cols={4} />
      </div>
    </div>
  )
}
