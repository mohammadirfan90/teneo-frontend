import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading lease">
      <Skeleton className="h-4 w-24" />
      <PageHeaderSkeleton />
      <Skeleton className="h-20 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border bg-card p-4 sm:p-6">
            <Skeleton className="h-5 w-20" />
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
