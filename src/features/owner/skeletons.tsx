import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

/** Header + filter bar + table: list pages in the owner workspace. */
export function ListPageSkeleton({ filters = true, rows = 6 }: { filters?: boolean; rows?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
      <PageHeaderSkeleton />
      {filters && <Skeleton className="h-10 w-full max-w-xl rounded-lg" />}
      <TableSkeleton rows={rows} />
    </div>
  )
}

/** Back link + title + two-column detail body. */
export function DetailPageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
      <Skeleton className="h-4 w-28" />
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}
