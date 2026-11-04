import { Skeleton } from "@/components/ui/skeleton"

export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-[70vw]" />
      </div>
      {withAction && <Skeleton className="hidden h-9 w-32 sm:block" />}
    </div>
  )
}

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="hidden border-b bg-surface-2/60 px-4 py-3 md:flex md:gap-6">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:gap-6">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={c === 0 ? "h-4 w-2/3 md:flex-1" : "h-4 w-1/3 md:flex-1"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
