import "server-only"

import { getRecentApplications, getRooms } from "@/features/owner/data"
import { api } from "@/lib/api/server"
import type { Page } from "@/types/api"
import type {
  LeaseSummaryView,
  PropertyView,
  RoomSearchView,
  RoomView,
  TicketSummaryView,
} from "@/types/domain"

export interface KnownFlat {
  id: string
  floor: number | null
  doorNumber: string | null
  buildingName: string
}

export interface DiscoveredRooms {
  rooms: RoomView[]
  flats: KnownFlat[]
}

/**
 * The API can't list a property's rooms. We rebuild the list from every place a room
 * id shows up for this owner: live search results (matched by title), applications,
 * leases and the maintenance queue. Draft rooms never appear in any of these.
 */
export async function discoverPropertyRooms(property: PropertyView): Promise<DiscoveredRooms> {
  const [search, apps, leases, tickets] = await Promise.all([
    property.status === "PUBLISHED"
      ? api<Page<RoomSearchView>>("/search/rooms", {
          query: { q: property.title.slice(0, 100), limit: 100 },
        }).catch(() => ({ items: [], nextCursor: null }) as Page<RoomSearchView>)
      : Promise.resolve({ items: [], nextCursor: null } as Page<RoomSearchView>),
    getRecentApplications(),
    api<Page<LeaseSummaryView>>("/leases/me"),
    api<Page<TicketSummaryView>>("/tickets/queue", { query: { limit: "100" } }),
  ])

  const live = search.items.filter((r) => r.propertyId === property.id)
  const ids = [
    ...live.map((r) => r.id),
    ...apps.filter((a) => a.property.id === property.id).map((a) => a.roomId),
    ...leases.items.map((l) => l.roomId),
    ...tickets.items.map((t) => t.roomId),
  ]
  const byId = await getRooms(ids)
  const rooms = [...byId.values()]
    .filter((r) => r.propertyId === property.id)
    .sort((a, b) => a.label.localeCompare(b.label))

  const flats = new Map<string, KnownFlat>()
  for (const r of live) if (r.flat) flats.set(r.flat.id, r.flat)
  return { rooms, flats: [...flats.values()] }
}
