import { AMENITY_LABEL, SORTS, SORT_LABEL, type RoomSort } from "@/features/rooms/query"
import { formatDate, formatMoney } from "@/lib/format"
import type { SavedSearchQuery } from "./types"

function amenitiesOf(q: SavedSearchQuery): string[] {
  const a = q.amenities
  if (!a) return []
  return (Array.isArray(a) ? a : a.split(",")).map((s) => s.trim()).filter(Boolean)
}

/** Backend search query (minor units, snake_case) → the /rooms URL params (whole taka). */
export function savedSearchHref(q: SavedSearchQuery): string {
  const p = new URLSearchParams()
  if (q.city) p.set("city", q.city)
  if (q.q) p.set("q", q.q)
  if (q.rent_min !== undefined) p.set("min", String(Math.floor(q.rent_min / 100)))
  if (q.rent_max !== undefined) p.set("max", String(Math.ceil(q.rent_max / 100)))
  const amenities = amenitiesOf(q)
  if (amenities.length) p.set("amenities", amenities.join(","))
  if (q.available_from) p.set("from", q.available_from)
  if (q.sort && q.sort !== "newest" && (SORTS as readonly string[]).includes(q.sort)) p.set("sort", q.sort)
  const s = p.toString()
  return s ? `/rooms?${s}` : "/rooms"
}

/** One-line human summary, e.g. "Dhaka · up to ৳35,000 · Rent: low to high". */
export function describeSavedSearch(q: SavedSearchQuery): string {
  const parts: string[] = []
  if (q.city) parts.push(q.city)
  if (q.q) parts.push(`“${q.q}”`)
  const cur = q.currency ?? "BDT"
  if (q.rent_min !== undefined && q.rent_max !== undefined)
    parts.push(`${formatMoney(q.rent_min, cur)}–${formatMoney(q.rent_max, cur)}`)
  else if (q.rent_max !== undefined) parts.push(`up to ${formatMoney(q.rent_max, cur)}`)
  else if (q.rent_min !== undefined) parts.push(`from ${formatMoney(q.rent_min, cur)}`)
  const amenities = amenitiesOf(q)
  if (amenities.length) parts.push(amenities.map((a) => AMENITY_LABEL[a] ?? a).join(", "))
  if (q.available_from) parts.push(`move in by ${formatDate(q.available_from)}`)
  if (q.sort && q.sort in SORT_LABEL) parts.push(SORT_LABEL[q.sort as RoomSort])
  return parts.length ? parts.join(" · ") : "All rooms"
}
