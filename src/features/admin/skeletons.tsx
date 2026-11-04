import { PageHeaderSkeleton, TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

/** Header → optional control bar → table, matching the admin list pages. */
export function AdminListSkeleton({
  filters = true,
  rows = 6,
  cols = 4,
  sections = 1,
}: {
  filters?: boolean
  rows?: number
  cols?: number
  sections?: number
}) {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
      <PageHeaderSkeleton withAction={false} />
      {filters && <Skeleton className="h-[116px] rounded-xl" />}
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          {sections > 1 && <Skeleton className="h-6 w-48" />}
          <TableSkeleton rows={rows} cols={cols} />
        </div>
      ))}
    </div>
  )
}

/** Back link, title, a facts panel and a side panel, matching the admin detail pages. */
export function AdminDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading">
      <div className="space-y-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    </div>
  )
}
