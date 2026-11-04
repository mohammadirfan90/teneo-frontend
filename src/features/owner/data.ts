import "server-only"

import { cache } from "react"

import { api } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import type { Page } from "@/types/api"
import type { ApplicationView, PropertyView, RoomView } from "@/types/domain"

// Authenticated reads shared by owner pages. React `cache` dedupes per request.

/** Full owner RoomView, or null when it doesn't exist (404/400). */
export const getRoom = cache(async (id: string): Promise<RoomView | null> => {
  try {
    return await api<RoomView>(`/rooms/${id}`)
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 400)) return null
    throw e
  }
})

export const getProperty = cache(async (id: string): Promise<PropertyView | null> => {
  try {
    return await api<PropertyView>(`/properties/${id}`)
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 400)) return null
    throw e
  }
})

export const getMyProperties = cache(async (): Promise<Page<PropertyView>> => {
  return api<Page<PropertyView>>("/properties/me", { query: { limit: 100 } })
})

/**
 * One of the caller's properties. GET /properties/:id is cached for 10 minutes by the
 * backend and isn't invalidated on publish, while /properties/me is — so prefer it.
 */
export const getOwnedProperty = cache(async (id: string): Promise<PropertyView | null> => {
  const mine = await getMyProperties()
  return mine.items.find((p) => p.id === id) ?? getProperty(id)
})

/** Latest applications on the owner's rooms (first 100), used to name tenants on leases/tickets. */
export const getRecentApplications = cache(async (): Promise<ApplicationView[]> => {
  const page = await api<Page<ApplicationView>>("/applications", { query: { limit: 100 } })
  return page.items
})

/** tenantUserId → display name, from applications (the API has no user lookup for owners). */
export async function getTenantNames(): Promise<Map<string, string>> {
  const apps = await getRecentApplications()
  return new Map(apps.map((a) => [a.tenantUserId, a.tenant.displayName]))
}

/** Rooms by id, skipping missing ones. */
export async function getRooms(ids: string[]): Promise<Map<string, RoomView>> {
  const unique = [...new Set(ids)]
  const rooms = await Promise.all(unique.map((id) => getRoom(id)))
  const out = new Map<string, RoomView>()
  rooms.forEach((r) => r && out.set(r.id, r))
  return out
}
