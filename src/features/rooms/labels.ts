import type { PropertyType, RoomType } from "@/types/domain"

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  PRIVATE: "Private room",
  SHARED: "Shared room",
  STUDIO: "Studio",
  ENTIRE_FLAT: "Entire flat",
}

export const PROPERTY_TYPE_LABEL: Record<PropertyType, string> = {
  BUILDING: "Apartment building",
  VILLA: "House",
  STANDALONE_FLAT: "Standalone flat",
}

export function leaseRange(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? `${min} months` : `${min}–${max} months`
  if (min) return `From ${min} months`
  if (max) return `Up to ${max} months`
  return null
}
