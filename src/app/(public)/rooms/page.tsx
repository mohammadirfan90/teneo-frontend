import { SearchX } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { CursorPagination } from "@/components/shared/cursor-pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getFacets, searchRooms, withCovers } from "@/features/rooms/data"
import { activeFilterCount, parseRoomFilters, toSearchQuery } from "@/features/rooms/query"
import { RoomCard, RoomCardSkeleton } from "@/features/rooms/room-card"
import { RoomFilters } from "@/features/rooms/room-filters"
import type { RawSearchParams } from "@/lib/search-params"

export const metadata: Metadata = {
  title: "Find a room",
  description:
    "Search verified rooms, studios and flats in Dhaka and Chattogram. Filter by area, rent, move-in date and amenities.",
  openGraph: { title: "Find a room on Teneo", description: "Verified rooms from identity-checked owners." },
}

async function Filters() {
  const { cities } = await getFacets()
  return <RoomFilters cities={cities} />
}

async function Results({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const sp = await searchParams
  const filters = parseRoomFilters(sp)
  const page = await searchRooms(toSearchQuery(filters))
  const rooms = await withCovers(page.items)

  if (rooms.length === 0) {
    const filtered = activeFilterCount(filters) > 0
    return (
      <EmptyState
        icon={SearchX}
        title={filtered ? "No rooms match these filters" : "No rooms are listed right now"}
        description={
          filtered
            ? "Try a wider rent range, another area, or fewer amenities."
            : "New listings appear here as soon as owners publish them."
        }
        action={
          filtered ? (
            <Button variant="outline" asChild>
              <Link href="/rooms">Clear all filters</Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room, i) => (
          <li key={room.id}>
            <RoomCard room={room} preload={i < 3} />
          </li>
        ))}
      </ul>
      <CursorPagination
        basePath="/rooms"
        searchParams={sp}
        nextCursor={page.nextCursor}
        itemCount={rooms.length}
      />
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading rooms">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i}>
          <RoomCardSkeleton />
        </li>
      ))}
    </ul>
  )
}

export default function RoomsPage(props: PageProps<"/rooms">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div>
        <h1 className="text-[1.75rem] font-semibold sm:text-3xl">Find a room</h1>
        <p className="mt-1.5 max-w-prose text-muted-foreground">
          Every listing comes from an owner who passed identity checks. Rents are monthly, in taka.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-[124px] rounded-xl" />}>
        <Filters />
      </Suspense>
      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </main>
  )
}
