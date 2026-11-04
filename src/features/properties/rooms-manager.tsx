"use client"

import { useQueries } from "@tanstack/react-query"
import { BedDouble, Info } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { useMounted } from "@/features/owner/local-records"
import type { RoomView } from "@/types/domain"
import { AddRoomDialog } from "./add-room-dialog"
import type { KnownFlat } from "./data"
import { flatLabel, flatLabelInline } from "./format"
import { RoomPanel } from "./room-panel"
import { useStructure } from "./structure-store"

const NO_IDS: string[] = []

/**
 * Rooms the server could discover, plus rooms created from this browser that the
 * API can't list (drafts). Local ids are re-fetched so their data is current.
 */
export function RoomsManager({
  propertyId,
  propertyTitle,
  propertyType,
  propertyPublished,
  kycApproved,
  serverRooms,
  knownFlats,
}: {
  propertyId: string
  propertyTitle: string
  propertyType: string
  propertyPublished: boolean
  kycApproved: boolean
  serverRooms: RoomView[]
  knownFlats: KnownFlat[]
}) {
  const mounted = useMounted()
  const localIds = useStructure((s) => s.roomIds[propertyId] ?? NO_IDS)
  const localFlats = useStructure((s) => s.flats[propertyId])
  const serverIds = new Set(serverRooms.map((r) => r.id))
  const extraIds = mounted ? localIds.filter((id) => !serverIds.has(id)) : []

  const extra = useQueries({
    queries: extraIds.map((id) => ({
      queryKey: ["owner-room", id],
      queryFn: () => apiClient.get<RoomView>(`/rooms/${id}`),
      retry: (n: number, e: unknown) => !(isApiError(e) && e.status < 500) && n < 2,
    })),
  })
  const loadingExtra = extra.some((q) => q.isPending)
  const extraRooms = extra
    .map((q) => q.data)
    .filter((r): r is RoomView => Boolean(r) && r!.propertyId === propertyId)

  const flatNames = new Map<string, string>()
  for (const f of knownFlats) flatNames.set(f.id, `${f.buildingName} · ${flatLabelInline(f)}`)
  for (const f of localFlats ?? []) if (!flatNames.has(f.id)) flatNames.set(f.id, flatLabel(f))

  const all = [
    ...serverRooms.map((r) => ({ room: r, local: false })),
    ...extraRooms.map((r) => ({ room: r, local: true })),
  ]

  return (
    <section aria-labelledby="rooms" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="rooms" className="text-lg font-semibold">
            Rooms
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            {loadingExtra
              ? "Looking up rooms…"
              : all.length === 1
                ? "1 room found"
                : `${all.length} rooms found`}
          </p>
        </div>
        <AddRoomDialog
          propertyId={propertyId}
          propertyTitle={propertyTitle}
          propertyType={propertyType}
          knownFlats={knownFlats}
        />
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" aria-hidden />
        <span>
          Teneo&apos;s API has no list of a property&apos;s rooms. This list combines rooms that are live in
          search or have applications, leases or maintenance tickets, plus drafts created in this browser.
          Draft rooms created elsewhere won&apos;t appear until the property is published.
        </span>
      </p>

      {all.length === 0 && !loadingExtra ? (
        <EmptyState
          compact
          icon={BedDouble}
          title="No rooms found"
          description="Add a room to this property, or publish it to make its draft rooms discoverable."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {all.map(({ room, local }) => (
            <RoomPanel
              key={`${room.id}-${room.version}`}
              room={room}
              flatName={room.flatId ? flatNames.get(room.flatId) : undefined}
              propertyPublished={propertyPublished}
              kycApproved={kycApproved}
              localOnly={local}
            />
          ))}
          {loadingExtra && <Skeleton className="h-28 rounded-xl" />}
        </ul>
      )}
    </section>
  )
}
