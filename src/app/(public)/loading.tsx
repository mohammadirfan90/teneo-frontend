import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6"
      aria-busy
      aria-label="Loading"
    >
      <Skeleton className="h-10 w-2/3 max-w-xl" />
      <Skeleton className="h-5 w-full max-w-2xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}
