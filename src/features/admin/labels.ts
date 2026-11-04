// Exact `targetEntityType` values written by B7A6 (backend-api.md §11.12).
export const ENTITY_TYPES = [
  "property",
  "room",
  "application",
  "viewing",
  "lease",
  "lease_amendment",
  "rent_invoice",
  "payment",
  "utility_bill",
  "property_meter",
  "meter_reading",
  "maintenance_ticket",
  "kyc_submission",
  "user",
  "saved_search",
] as const
export type EntityType = (typeof ENTITY_TYPES)[number]

export const ENTITY_LABEL: Record<EntityType, string> = {
  property: "Property",
  room: "Room",
  application: "Application",
  viewing: "Viewing",
  lease: "Lease",
  lease_amendment: "Lease amendment",
  rent_invoice: "Rent invoice",
  payment: "Payment",
  utility_bill: "Utility bill",
  property_meter: "Meter",
  meter_reading: "Meter reading",
  maintenance_ticket: "Maintenance ticket",
  kyc_submission: "KYC submission",
  user: "User",
  saved_search: "Saved search",
}

export function entityLabel(type: string | null): string {
  if (!type) return "—"
  return (ENTITY_LABEL as Record<string, string>)[type] ?? type
}

/**
 * Activity chart families. Fifteen entity types can't each get a colour, so they fold into four
 * groups whose order matches the validated categorical order of the chart tokens.
 */
export const ACTIVITY_GROUPS = [
  {
    key: "listings",
    label: "Listings",
    color: "var(--chart-1)",
    types: ["property", "room", "saved_search"],
  },
  {
    key: "rentals",
    label: "Applications & leases",
    color: "var(--chart-4)",
    types: ["application", "viewing", "lease", "lease_amendment"],
  },
  {
    key: "billing",
    label: "Billing & payments",
    color: "var(--chart-3)",
    types: ["rent_invoice", "payment", "utility_bill", "property_meter", "meter_reading"],
  },
  {
    key: "support",
    label: "Maintenance & accounts",
    color: "var(--chart-2)",
    types: ["maintenance_ticket", "kyc_submission", "user"],
  },
] as const
export type ActivityGroupKey = (typeof ACTIVITY_GROUPS)[number]["key"]

export function activityGroupOf(type: string | null): ActivityGroupKey {
  const hit = ACTIVITY_GROUPS.find((g) => (g.types as readonly string[]).includes(type ?? ""))
  return hit?.key ?? "support"
}

export const ACTOR_ROLES = ["ADMIN", "OWNER", "TENANT", "SYSTEM"] as const

/** Overview chart windows in days (`?days=`). */
export const ACTIVITY_RANGES = [14, 30, 90] as const
export const DEFAULT_RANGE = 14
