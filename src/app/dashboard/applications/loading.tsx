import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading applications">
      <PageHeaderSkeleton />
      <Skeleton className="h-9 w-full sm:w-56" />
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}
