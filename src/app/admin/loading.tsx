import { PageHeaderSkeleton, StatRowSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <Skeleton className="mt-6 h-64 w-full" />
        </div>
        <div className="rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-2 h-4 w-56 max-w-full" />
          <div className="mt-6 flex flex-col gap-4">
            {[80, 60, 30].map((w) => (
              <Skeleton key={w} className="h-6" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
      <TableSkeleton rows={5} />
    </div>
  )
}
