import "server-only"

import { cache } from "react"

import { api } from "@/lib/api/server"
import { isApiError } from "@/lib/api/errors"
import type { PropertyView, RoomView } from "@/types/domain"

/** Room + property behind a lease/application/ticket. Null parts when the API hides or lost them. */
export interface RoomContext {
  room: RoomView | null
  property: PropertyView | null
}

async function orNull<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (isApiError(e) && (e.status === 404 || e.status === 403 || e.status === 400)) return null
    throw e
  }
}

export const getRoom = cache((id: string) => orNull(api<RoomView>(`/rooms/${id}`)))
export const getProperty = cache((id: string) => orNull(api<PropertyView>(`/properties/${id}`)))

export const getRoomContext = cache(async (roomId: string): Promise<RoomContext> => {
  const room = await getRoom(roomId)
  const property = room ? await getProperty(room.propertyId) : null
  return { room, property }
})

/** Lookup for many rooms at once (deduped), keyed by room id. */
export async function getRoomContexts(roomIds: string[]): Promise<Map<string, RoomContext>> {
  const unique = [...new Set(roomIds)]
  const all = await Promise.all(unique.map((id) => getRoomContext(id)))
  return new Map(unique.map((id, i) => [id, all[i]]))
}

export function roomTitle(ctx: RoomContext | undefined, fallback = "Room"): string {
  if (!ctx?.room) return fallback
  return ctx.property ? `${ctx.room.label} · ${ctx.property.title}` : ctx.room.label
}
