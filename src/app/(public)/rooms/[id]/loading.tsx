import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6"
      aria-busy
      aria-label="Loading room"
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="aspect-[16/7] w-full rounded-xl" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-40" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}
