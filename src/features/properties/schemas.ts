import { z } from "zod"

import type { PropertyType, RoomType } from "@/types/domain"
import type { PropertyView, RoomView } from "@/types/domain"
import type { BuildingView } from "@/features/owner/types"

// Mirrors B7A6 property/building/flat/room Zod schemas (backend-api.md §11.3).
// Numeric inputs are kept as strings in the form and converted in to*Payload().

export const PROPERTY_TYPES = [
  "BUILDING",
  "VILLA",
  "STANDALONE_FLAT",
] as const satisfies readonly PropertyType[]
export const ROOM_TYPES = [
  "PRIVATE",
  "SHARED",
  "STUDIO",
  "ENTIRE_FLAT",
] as const satisfies readonly RoomType[]

const optionalText = (max: number, label = "this") =>
  z.string().trim().max(max, `Keep ${label} under ${max.toLocaleString()} characters`)

const isNum = (v: string) => v.trim() !== "" && Number.isFinite(Number(v))
const isInt = (v: string) => /^-?\d+$/.test(v.trim())

// ── Property ─────────────────────────────────────────────────────────

export const propertySchema = z.object({
  title: z.string().trim().min(1, "Give the property a name").max(200, "Use at most 200 characters"),
  description: optionalText(2000, "the description"),
  addressLine1: z.string().trim().min(1, "Enter the street address").max(200, "Use at most 200 characters"),
  addressLine2: optionalText(200, "this line"),
  city: z.string().trim().min(1, "Enter the city").max(100, "Use at most 100 characters"),
  area: optionalText(100, "the area"),
  postalCode: optionalText(20, "the postal code"),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a two-letter country code, e.g. BD"),
  propertyType: z.enum(PROPERTY_TYPES, "Choose the kind of property"),
})
export type PropertyValues = z.infer<typeof propertySchema>

export const emptyProperty: PropertyValues = {
  title: "",
  description: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  area: "",
  postalCode: "",
  countryCode: "BD",
  propertyType: "BUILDING",
}

export function propertyToValues(p: PropertyView): PropertyValues {
  return {
    title: p.title,
    description: p.description ?? "",
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2 ?? "",
    city: p.city,
    area: p.area ?? "",
    postalCode: p.postalCode ?? "",
    countryCode: p.countryCode,
    propertyType: p.propertyType,
  }
}

/** Create: omit empty optionals. Patch: send nulls to clear them. */
export function toPropertyPayload(v: PropertyValues, mode: "create" | "patch") {
  const opt = (s: string) => (s.trim() ? s.trim() : mode === "patch" ? null : undefined)
  return {
    title: v.title.trim(),
    description: opt(v.description),
    addressLine1: v.addressLine1.trim(),
    addressLine2: opt(v.addressLine2),
    city: v.city.trim(),
    area: opt(v.area),
    postalCode: opt(v.postalCode),
    countryCode: v.countryCode.trim().toUpperCase(),
    propertyType: v.propertyType,
  }
}

// ── Building & flat ──────────────────────────────────────────────────

export const buildingSchema = z.object({
  name: z.string().trim().min(1, "Name the building").max(100, "Use at most 100 characters"),
  floors: z
    .string()
    .trim()
    .refine((v) => v === "" || (isInt(v) && Number(v) >= 1 && Number(v) <= 200), "Between 1 and 200 floors"),
})
export type BuildingValues = z.infer<typeof buildingSchema>

export function buildingToValues(b: BuildingView): BuildingValues {
  return { name: b.name, floors: b.floors === null ? "" : String(b.floors) }
}

export function toBuildingPayload(v: BuildingValues, mode: "create" | "patch") {
  const floors = v.floors.trim() ? Number(v.floors) : mode === "patch" ? null : undefined
  return { name: v.name.trim(), floors }
}

/** A sensible single building for houses and standalone flats. */
export function suggestedBuilding(type: PropertyType, title: string): BuildingValues {
  if (type === "VILLA") return { name: "Main house", floors: "2" }
  if (type === "STANDALONE_FLAT") return { name: title.slice(0, 100) || "Main building", floors: "" }
  return { name: "", floors: "" }
}

export const flatSchema = z.object({
  floor: z
    .string()
    .trim()
    .refine((v) => v === "" || (isInt(v) && Number(v) >= -5 && Number(v) <= 200), "Floor between -5 and 200"),
  doorNumber: optionalText(20, "the door number"),
})
export type FlatValues = z.infer<typeof flatSchema>

export function toFlatPayload(v: FlatValues) {
  return {
    floor: v.floor.trim() ? Number(v.floor) : undefined,
    doorNumber: v.doorNumber.trim() || undefined,
  }
}

// ── Room ─────────────────────────────────────────────────────────────

const MAX_TAKA = 90_000_000_000_000 // keeps minor units inside Number.MAX_SAFE_INTEGER

const takaAmount = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${what} in taka`)
    .refine(isNum, "Enter a number")
    .refine((v) => Number(v) >= 0, "Can't be negative")
    .refine((v) => Number(v) <= MAX_TAKA, "That amount is too large")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Use at most two decimal places")

const optionalMonths = z
  .string()
  .trim()
  .refine((v) => v === "" || (isInt(v) && Number(v) >= 1 && Number(v) <= 60), "Between 1 and 60 months")

export const roomSchema = z
  .object({
    label: z.string().trim().min(1, "Name the room").max(100, "Use at most 100 characters"),
    roomType: z.enum(ROOM_TYPES, "Choose a room type"),
    sizeSqft: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || (isNum(v) && Number(v) > 0 && Number(v) <= 100_000),
        "Between 1 and 100,000"
      ),
    maxOccupants: z
      .string()
      .trim()
      .refine((v) => isInt(v) && Number(v) >= 1 && Number(v) <= 20, "Between 1 and 20 people"),
    rent: takaAmount("monthly rent"),
    deposit: takaAmount("deposit"),
    billsIncluded: z.boolean(),
    amenities: z.array(z.string().min(1).max(50)).max(50, "Choose at most 50 amenities"),
    availableFrom: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date"),
    minLeaseMonths: optionalMonths,
    maxLeaseMonths: optionalMonths,
    rules: optionalText(2000, "the house rules"),
  })
  .superRefine((v, ctx) => {
    if (v.minLeaseMonths && v.maxLeaseMonths && Number(v.minLeaseMonths) > Number(v.maxLeaseMonths)) {
      ctx.addIssue({
        code: "custom",
        path: ["maxLeaseMonths"],
        message: "Must be at least the minimum lease",
      })
    }
  })
export type RoomValues = z.infer<typeof roomSchema>

export const emptyRoom: RoomValues = {
  label: "",
  roomType: "PRIVATE",
  sizeSqft: "",
  maxOccupants: "1",
  rent: "",
  deposit: "",
  billsIncluded: false,
  amenities: [],
  availableFrom: "",
  minLeaseMonths: "",
  maxLeaseMonths: "",
  rules: "",
}

const toMinor = (taka: string) => Math.round(Number(taka) * 100)
const fromMinor = (minor: string) => {
  const n = Number(minor) / 100
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function roomToValues(r: RoomView): RoomValues {
  return {
    label: r.label,
    roomType: r.roomType,
    sizeSqft: r.sizeSqft === null ? "" : String(Number(r.sizeSqft)),
    maxOccupants: String(r.maxOccupants),
    rent: fromMinor(r.baseRentMinor),
    deposit: fromMinor(r.depositMinor),
    billsIncluded: r.billsIncluded ?? false,
    amenities: r.amenities,
    availableFrom: r.availableFrom ?? "",
    minLeaseMonths: r.minLeaseMonths === null ? "" : String(r.minLeaseMonths),
    maxLeaseMonths: r.maxLeaseMonths === null ? "" : String(r.maxLeaseMonths),
    rules: r.rules ?? "",
  }
}

/** `currency` is kept from the existing room on edit (older listings may not be in BDT). */
export function toRoomPayload(v: RoomValues, mode: "create" | "patch", currency = "BDT") {
  const clear = mode === "patch" ? null : undefined
  return {
    label: v.label.trim(),
    roomType: v.roomType,
    sizeSqft: v.sizeSqft ? Number(v.sizeSqft) : clear,
    maxOccupants: Number(v.maxOccupants),
    baseRentMinor: toMinor(v.rent),
    depositMinor: toMinor(v.deposit),
    currency,
    billsIncluded: v.billsIncluded,
    amenities: v.amenities,
    availableFrom: v.availableFrom || clear,
    minLeaseMonths: v.minLeaseMonths ? Number(v.minLeaseMonths) : clear,
    maxLeaseMonths: v.maxLeaseMonths ? Number(v.maxLeaseMonths) : clear,
    rules: v.rules.trim() || clear,
  }
}

/** Backend field names → form field names (rent/deposit are entered in taka). */
export const ROOM_FIELD_ALIASES: Record<string, keyof RoomValues> = {
  baseRentMinor: "rent",
  depositMinor: "deposit",
}
