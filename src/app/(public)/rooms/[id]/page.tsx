import {
  BedDouble,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock,
  ImageOff,
  MapPin,
  Ruler,
  ShieldCheck,
  Users,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { ApplyPanel } from "@/features/rooms/apply-panel"
import {
  getAllLiveRooms,
  getPublicProperty,
  getPublicRoom,
  getRoomPhotos,
  withCovers,
} from "@/features/rooms/data"
import { RoomGallery } from "@/features/rooms/gallery"
import { PROPERTY_TYPE_LABEL, ROOM_TYPE_LABEL, leaseRange } from "@/features/rooms/labels"
import { AMENITY_LABEL } from "@/features/rooms/query"
import { RoomCard } from "@/features/rooms/room-card"
import { getSessionHint } from "@/lib/api/server"
import { formatDate, formatMoney, humanize } from "@/lib/format"

async function roomMetadata(id: string): Promise<Metadata> {
  "use cache"
  const room = await getPublicRoom(id)
  if (!room) return { title: "Room not found" }
  const [property, photos] = await Promise.all([getPublicProperty(room.propertyId), getRoomPhotos(id)])
  const title = `${room.label} · ${property?.title ?? "Teneo"}`
  const description = `${ROOM_TYPE_LABEL[room.roomType]} in ${property?.area ? `${property.area}, ` : ""}${property?.city ?? ""} for ${formatMoney(room.baseRentMinor, room.currency)} a month.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: photos[0] ? [{ url: photos[0].url, alt: photos[0].alt ?? title }] : [],
    },
  }
}

export async function generateMetadata(props: PageProps<"/rooms/[id]">): Promise<Metadata> {
  const { id } = await props.params
  return roomMetadata(id)
}

async function SessionApply({ roomId, roomLabel }: { roomId: string; roomLabel: string }) {
  const session = await getSessionHint()
  return <ApplyPanel roomId={roomId} roomLabel={roomLabel} role={session ? session.role : "ANON"} />
}

function Fact({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-subtle" aria-hidden />
      <div>
        <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
        <dd className="font-medium">{value}</dd>
      </div>
    </div>
  )
}

async function RoomDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const room = await getPublicRoom(id)
  if (!room || room.status !== "PUBLISHED") notFound()

  const [property, photos, live] = await Promise.all([
    getPublicProperty(room.propertyId),
    getRoomPhotos(id),
    getAllLiveRooms(),
  ])
  if (!property) notFound()

  const listing = live.find((r) => r.id === id)
  const similar = await withCovers(
    live.filter((r) => r.id !== id && r.property.city === property.city).slice(0, 3)
  )
  const lease = leaseRange(room.minLeaseMonths, room.maxLeaseMonths)
  const place = [property.area, property.city].filter(Boolean).join(", ")

  return (
    <>
      <div className="flex flex-col gap-4">
        <Link
          href="/rooms"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All rooms
        </Link>
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-3xl">{room.label}</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-4" aria-hidden />
            {property.title} · {place}
          </p>
        </div>
      </div>

      {photos.length > 0 ? (
        <RoomGallery photos={photos} title={`${room.label} at ${property.title}`} />
      ) : (
        <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl border border-dashed md:aspect-[16/5] bg-card text-subtle">
          <ImageOff className="size-6" aria-hidden />
          <p className="text-sm">The owner hasn&apos;t added photos yet</p>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="facts">
            <h2 id="facts" className="sr-only">
              Room facts
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <Fact icon={BedDouble} label="Type" value={ROOM_TYPE_LABEL[room.roomType]} />
              {room.sizeSqft && <Fact icon={Ruler} label="Size" value={`${Number(room.sizeSqft)} sq ft`} />}
              <Fact
                icon={Users}
                label="Occupancy"
                value={room.maxOccupants === 1 ? "1 person" : `Up to ${room.maxOccupants} people`}
              />
              <Fact
                icon={CalendarDays}
                label="Available"
                value={room.availableFrom ? `From ${formatDate(room.availableFrom)}` : "Now"}
              />
              {lease && <Fact icon={Clock} label="Lease length" value={lease} />}
              <Fact icon={MapPin} label="Building" value={PROPERTY_TYPE_LABEL[property.propertyType]} />
            </dl>
          </section>

          {property.description && (
            <section aria-labelledby="about">
              <h2 id="about" className="text-lg font-semibold">
                About the property
              </h2>
              <p className="mt-2 max-w-prose leading-relaxed text-muted-foreground">{property.description}</p>
            </section>
          )}

          {room.amenities.length > 0 && (
            <section aria-labelledby="amenities">
              <h2 id="amenities" className="text-lg font-semibold">
                What&apos;s included
              </h2>
              <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                {room.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2.5">
                    <Check className="size-4 text-primary" aria-hidden />
                    {AMENITY_LABEL[a] ?? humanize(a)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="location">
            <h2 id="location" className="text-lg font-semibold">
              Location
            </h2>
            <address className="mt-2 text-muted-foreground not-italic">
              {property.addressLine1}
              {property.addressLine2 ? `, ${property.addressLine2}` : ""}
              <br />
              {place}
              {property.postalCode ? ` ${property.postalCode}` : ""}
            </address>
            {listing?.flat && (
              <p className="mt-1 text-sm text-muted-foreground">
                {listing.flat.buildingName}
                {listing.flat.floor !== null ? ` · floor ${listing.flat.floor}` : ""}
                {listing.flat.doorNumber ? ` · flat ${listing.flat.doorNumber}` : ""}
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(room.baseRentMinor, room.currency)}
              <span className="text-base font-normal text-muted-foreground"> / month</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              Deposit {formatMoney(room.depositMinor, room.currency)}
            </p>
            <div className="mt-5">
              <Suspense fallback={<Skeleton className="h-11 w-full" />}>
                <SessionApply roomId={room.id} roomLabel={room.label} />
              </Suspense>
            </div>
            <div className="mt-5 flex items-start gap-3 border-t pt-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Listed by{" "}
                <span className="font-medium text-foreground">
                  {listing?.owner.displayName ?? "the owner"}
                </span>
                , an identity-verified owner. Rent is paid by card through Teneo.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="flex flex-col gap-4 border-t pt-10">
          <h2 id="similar" className="text-lg font-semibold">
            More rooms in {property.city}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((r) => (
              <li key={r.id}>
                <RoomCard room={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-label="Loading room">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="aspect-[16/7] w-full rounded-xl" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11" />
          ))}
        </div>
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}

export default function RoomPage(props: PageProps<"/rooms/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={<DetailSkeleton />}>
        <RoomDetail params={props.params} />
      </Suspense>
    </main>
  )
}
