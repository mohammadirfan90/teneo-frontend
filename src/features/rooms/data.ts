import "server-only"

import { cacheLife, cacheTag } from "next/cache"

import { backend } from "@/lib/api/backend"
import { isApiError } from "@/lib/api/errors"
import type { Page } from "@/types/api"
import type { PropertyView, RoomSearchView, RoomView } from "@/types/domain"

// Public listing reads. Anonymous calls (D-013), so they are safe to cache and
// share between visitors. Never read cookies in here ('use cache' forbids it).

export interface RoomPhoto {
  id: string
  roomId: string
  url: string
  width: number | null
  height: number | null
  position: number
  alt: string | null
}

export type SearchQuery = Record<string, string | number | undefined>

export async function searchRooms(query: SearchQuery): Promise<Page<RoomSearchView>> {
  "use cache"
  cacheLife("minutes")
  cacheTag("rooms")
  return backend<Page<RoomSearchView>>("/search/rooms", { query })
}

export async function getRoomPhotos(roomId: string): Promise<RoomPhoto[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("rooms", `room:${roomId}`)
  try {
    return await backend<RoomPhoto[]>(`/rooms/${roomId}/photos`)
  } catch (e) {
    if (isApiError(e) && e.status === 404) return []
    throw e
  }
}

/** Public room view, or null when the room isn't live (404). */
export async function getPublicRoom(roomId: string): Promise<RoomView | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("rooms", `room:${roomId}`)
  try {
    return await backend<RoomView>(`/rooms/${roomId}`)
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 400)) return null
    throw e
  }
}

export async function getPublicProperty(propertyId: string): Promise<PropertyView | null> {
  "use cache"
  cacheLife("minutes")
  cacheTag("rooms", `property:${propertyId}`)
  try {
    return await backend<PropertyView>(`/properties/${propertyId}`)
  } catch (e) {
    if (isApiError(e) && e.status === 404) return null
    throw e
  }
}

/** Every live room (first 100), used for city/area facets and "similar rooms". */
export async function getAllLiveRooms(): Promise<RoomSearchView[]> {
  "use cache"
  cacheLife("minutes")
  cacheTag("rooms")
  const page = await backend<Page<RoomSearchView>>("/search/rooms", { query: { limit: 100, sort: "newest" } })
  return page.items
}

export interface AreaFacet {
  city: string
  area: string | null
  count: number
}

export async function getFacets(): Promise<{ cities: string[]; areas: AreaFacet[] }> {
  const rooms = await getAllLiveRooms()
  const cities = [...new Set(rooms.map((r) => r.property.city))].sort()
  const areaMap = new Map<string, AreaFacet>()
  for (const r of rooms) {
    const key = `${r.property.city}|${r.property.area ?? ""}`
    const cur = areaMap.get(key) ?? { city: r.property.city, area: r.property.area, count: 0 }
    cur.count += 1
    areaMap.set(key, cur)
  }
  return { cities, areas: [...areaMap.values()].sort((a, b) => b.count - a.count) }
}

/** Search card data enriched with the cover photo. */
export interface RoomCardData extends RoomSearchView {
  cover: RoomPhoto | null
  photoCount: number
}

export async function withCovers(rooms: RoomSearchView[]): Promise<RoomCardData[]> {
  const photos = await Promise.all(rooms.map((r) => getRoomPhotos(r.id)))
  return rooms.map((r, i) => ({ ...r, cover: photos[i][0] ?? null, photoCount: photos[i].length }))
}
