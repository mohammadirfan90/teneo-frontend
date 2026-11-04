import { PageHeaderSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Loading request">
      <Skeleton className="h-4 w-28" />
      <PageHeaderSkeleton withAction={false} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-16 rounded-xl" />
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-14 w-3/4" />
            <Skeleton className="ml-auto h-14 w-2/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <Skeleton className="h-60 rounded-xl" />
      </div>
    </div>
  )
}
