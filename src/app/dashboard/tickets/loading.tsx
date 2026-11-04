import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading maintenance requests">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-full sm:w-96" />
      <TableSkeleton rows={5} cols={6} />
    </div>
  )
}
