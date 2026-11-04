import { int, oneOf, str, type RawSearchParams } from "@/lib/search-params"

export const SORTS = ["newest", "price_asc", "price_desc"] as const
export type RoomSort = (typeof SORTS)[number]

export const SORT_LABEL: Record<RoomSort, string> = {
  newest: "Newest first",
  price_asc: "Rent: low to high",
  price_desc: "Rent: high to low",
}

export const AMENITIES: Array<{ value: string; label: string }> = [
  { value: "wifi", label: "Wi-Fi" },
  { value: "air-conditioning", label: "Air conditioning" },
  { value: "attached-bathroom", label: "Attached bathroom" },
  { value: "balcony", label: "Balcony" },
  { value: "furnished", label: "Furnished" },
  { value: "kitchen", label: "Private kitchen" },
  { value: "kitchen-access", label: "Kitchen access" },
  { value: "lift", label: "Lift" },
  { value: "generator", label: "Generator backup" },
  { value: "parking", label: "Parking" },
  { value: "security", label: "24h security" },
  { value: "laundry", label: "Laundry" },
  { value: "gas", label: "Gas line" },
]

export const AMENITY_LABEL: Record<string, string> = Object.fromEntries(
  AMENITIES.map((a) => [a.value, a.label])
)

/** Normalised, URL-facing filters (rent in whole taka). */
export interface RoomFilters {
  city?: string
  q?: string
  min?: number
  max?: number
  amenities: string[]
  from?: string
  sort: RoomSort
  cursor?: string
}

export function parseRoomFilters(sp: RawSearchParams): RoomFilters {
  const amenities = (str(sp, "amenities") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a in AMENITY_LABEL)
  const from = str(sp, "from")
  return {
    city: str(sp, "city"),
    q: str(sp, "q")?.slice(0, 100),
    min: int(sp, "min", 0, 10_000_000),
    max: int(sp, "max", 0, 10_000_000),
    amenities,
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined,
    sort: oneOf(sp, "sort", SORTS) ?? "newest",
    cursor: str(sp, "cursor"),
  }
}

/** URL filters → backend `/search/rooms` query (minor units, snake_case). */
export function toSearchQuery(f: RoomFilters, limit = 12): Record<string, string | number | undefined> {
  const hasRent = f.min !== undefined || f.max !== undefined
  return {
    city: f.city,
    q: f.q,
    rent_min: f.min !== undefined ? f.min * 100 : undefined,
    rent_max: f.max !== undefined ? f.max * 100 : undefined,
    currency: hasRent ? "BDT" : undefined,
    amenities: f.amenities.length ? f.amenities.join(",") : undefined,
    available_from: f.from,
    sort: f.sort,
    cursor: f.cursor,
    limit,
  }
}

export function activeFilterCount(f: RoomFilters): number {
  return (
    [f.city, f.q, f.min, f.max, f.from].filter((v) => v !== undefined).length + (f.amenities.length ? 1 : 0)
  )
}
