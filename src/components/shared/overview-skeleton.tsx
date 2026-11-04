import { PageHeaderSkeleton, StatRowSkeleton, TableSkeleton } from "./skeletons"

export function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <TableSkeleton rows={5} />
    </div>
  )
}
