import { ArrowRight, Building2, Check } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FAQ_RENTERS, HOW_STEPS_RENTER } from "@/features/marketing/content"
import { FaqList } from "@/features/marketing/faq-list"
import { HeroSearch } from "@/features/marketing/hero-search"
import { getAllLiveRooms, getFacets, withCovers } from "@/features/rooms/data"
import { RoomCard, RoomCardSkeleton } from "@/features/rooms/room-card"

export const metadata: Metadata = {
  title: { absolute: "Teneo — verified rooms, roommates and rent in one place" },
  description:
    "Find a verified room in Dhaka or Chattogram, match with compatible roommates, sign the lease online and pay rent by card.",
  openGraph: {
    title: "Teneo — verified rooms, roommates and rent in one place",
    description: "From search to move-in: verified listings, digital leases and online rent.",
  },
}

async function HeroSearchWithCities() {
  const { cities } = await getFacets()
  return <HeroSearch cities={cities} />
}

async function FeaturedRoom() {
  const rooms = await withCovers((await getAllLiveRooms()).slice(0, 1))
  if (!rooms[0]) return null
  return (
    <div className="mx-auto w-full max-w-sm lg:ml-auto">
      <p className="mb-3 text-sm text-muted-foreground">Newest listing</p>
      <RoomCard room={rooms[0]} preload />
    </div>
  )
}

async function NewestRooms() {
  const live = await getAllLiveRooms()
  if (live.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No rooms are listed yet"
        description="New listings appear here the moment a verified owner publishes them."
        action={
          <Button variant="outline" asChild>
            <Link href="/owners">List your property</Link>
          </Button>
        }
      />
    )
  }
  // The newest room is already featured in the hero.
  const rooms = await withCovers(live.slice(1, 7))
  if (rooms.length === 0) return null
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomCard room={room} />
        </li>
      ))}
    </ul>
  )
}

async function Areas() {
  const { areas } = await getFacets()
  if (areas.length === 0) return null
  return (
    <section aria-labelledby="areas" className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6">
      <h2 id="areas" className="text-lg font-semibold">
        Browse by area
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {areas.map((a) => {
          const params = new URLSearchParams({ city: a.city, ...(a.area ? { q: a.area } : {}) })
          return (
            <li key={`${a.city}-${a.area}`}>
              <Link
                href={`/rooms?${params}`}
                className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3.5 text-sm transition-colors duration-150 hover:border-input hover:bg-muted"
              >
                <span className="font-medium">{a.area ?? a.city}</span>
                {a.area && <span className="text-muted-foreground">{a.city}</span>}
                <span className="rounded bg-surface-2 px-1.5 text-xs text-muted-foreground tabular-nums">
                  {a.count}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const OWNER_POINTS = [
  "List single rooms or the entire flat",
  "Screen applicants and schedule viewings",
  "Digital leases signed by both sides",
  "Invoice rent and split metered utilities",
  "Track repairs against response targets",
]

export default function HomePage() {
  return (
    <main>
      <section className="border-b">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl leading-[1.08] font-bold sm:text-5xl">
              Rent a verified room without the guesswork
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Teneo lists rooms only from identity-checked owners, and handles the application, the lease and
              the monthly rent in one place.
            </p>
            <div className="mt-8">
              <Suspense fallback={<Skeleton className="h-14 rounded-xl" />}>
                <HeroSearchWithCities />
              </Suspense>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Have rooms to let?{" "}
              <Link href="/owners" className="font-medium text-primary underline-offset-4 hover:underline">
                List your property
              </Link>
            </p>
          </div>
          <Suspense
            fallback={
              <div className="mx-auto w-full max-w-sm lg:ml-auto">
                <RoomCardSkeleton />
              </div>
            }
          >
            <FeaturedRoom />
          </Suspense>
        </div>
      </section>

      <section aria-labelledby="newest" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="newest" className="text-2xl font-semibold">
              Recently listed
            </h2>
            <p className="mt-1 text-muted-foreground">Live rooms you can apply for today.</p>
          </div>
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href="/rooms">
              All rooms <ArrowRight />
            </Link>
          </Button>
        </div>
        <Suspense
          fallback={
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <li key={i}>
                  <RoomCardSkeleton />
                </li>
              ))}
            </ul>
          }
        >
          <NewestRooms />
        </Suspense>
        <Button variant="outline" asChild className="mt-6 w-full sm:hidden">
          <Link href="/rooms">
            All rooms <ArrowRight />
          </Link>
        </Button>
      </section>

      <Suspense fallback={null}>
        <Areas />
      </Suspense>

      <section aria-labelledby="how" className="border-y bg-card/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 id="how" className="text-2xl font-semibold">
                From search to move-in
              </h2>
              <p className="mt-1 max-w-prose text-muted-foreground">
                The whole tenancy runs in one place, so nothing gets lost in chat threads.
              </p>
            </div>
            <Link href="/how-it-works" className="text-sm font-medium text-primary hover:underline">
              How it works in detail
            </Link>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            {HOW_STEPS_RENTER.map((step, i) => (
              <li key={step.title} className="relative md:pr-4">
                <span className="font-mono text-sm text-primary tabular-nums">0{i + 1}</span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="owners" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 rounded-2xl border bg-card p-6 sm:p-10 lg:grid-cols-2">
          <div>
            <h2 id="owners" className="text-2xl font-semibold">
              For owners: fill rooms with tenants you&apos;ve checked
            </h2>
            <p className="mt-3 max-w-prose leading-relaxed text-muted-foreground">
              Applicants verify their identity before they can apply, so you only screen real people. Once
              someone moves in, rent and repairs are handled in the same dashboard.
            </p>
            <Button asChild className="mt-6">
              <Link href="/register?role=owner">List your property</Link>
            </Button>
          </div>
          <ul className="flex flex-col gap-3 self-center">
            {OWNER_POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl px-4 pb-20 sm:px-6">
        <h2 id="faq" className="text-2xl font-semibold">
          Common questions
        </h2>
        <div className="mt-6">
          <FaqList items={FAQ_RENTERS.slice(0, 4)} />
        </div>
        <Link href="/faq" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          See all questions
        </Link>
      </section>
    </main>
  )
}
