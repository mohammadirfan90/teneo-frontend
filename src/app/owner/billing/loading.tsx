import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-10" aria-busy aria-label="Loading">
      <PageHeaderSkeleton />
      <Skeleton className="h-80 rounded-xl" />
      <TableSkeleton rows={5} cols={6} />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}
