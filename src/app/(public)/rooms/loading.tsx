import { Skeleton } from "@/components/ui/skeleton"
import { RoomCardSkeleton } from "@/features/rooms/room-card"

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10"
      aria-busy
      aria-label="Loading rooms"
    >
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-[124px] rounded-xl" />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <RoomCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  )
}
