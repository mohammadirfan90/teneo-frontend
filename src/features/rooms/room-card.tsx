import { ImageOff, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { formatDate, formatMoney } from "@/lib/format"
import type { RoomCardData } from "./data"
import { ROOM_TYPE_LABEL } from "./labels"

export function RoomCard({ room, preload = false }: { room: RoomCardData; preload?: boolean }) {
  // No clock reads here: cards render inside the prerendered shell.
  const available = room.availableFrom ? `From ${formatDate(room.availableFrom)}` : "Available now"

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-sm">
      <div className="relative aspect-[4/3] bg-surface-2">
        {room.cover ? (
          <Image
            src={room.cover.url}
            alt={room.cover.alt ?? `${room.label} at ${room.property.title}`}
            fill
            sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            preload={preload}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-subtle">
            <ImageOff className="size-5" aria-hidden />
            <span className="text-xs">No photos yet</span>
          </div>
        )}
        {room.photoCount > 1 && (
          <span className="absolute right-2.5 bottom-2.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-medium text-white tabular-nums">
            {room.photoCount} photos
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-lg font-semibold tabular-nums">
          {formatMoney(room.baseRentMinor, room.currency)}
          <span className="text-sm font-normal text-muted-foreground"> / month</span>
        </p>
        <h3 className="mt-1 leading-snug font-medium">
          <Link
            href={`/rooms/${room.id}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none after:focus-visible:ring-2 after:focus-visible:ring-ring"
          >
            {room.label}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {room.property.title} · {room.property.area ? `${room.property.area}, ` : ""}
            {room.property.city}
          </span>
        </p>
        <p className="mt-auto pt-3 text-[0.8125rem] text-muted-foreground">
          {ROOM_TYPE_LABEL[room.roomType]}
          {room.sizeSqft ? ` · ${Number(room.sizeSqft)} sq ft` : ""} · {available}
        </p>
      </div>
    </article>
  )
}

export function RoomCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-surface-2" />
      <div className="space-y-2.5 p-4">
        <div className="h-5 w-28 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-2 pt-3" />
      </div>
    </div>
  )
}
