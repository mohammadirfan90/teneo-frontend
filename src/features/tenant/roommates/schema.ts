import { z } from "zod"

import type { PreferencesView, Visibility } from "../types"

export const SMOKING = ["NO", "OCCASIONALLY", "YES"] as const
export const PETS = ["NO", "YES", "ALLERGY"] as const
export const SLEEP = ["EARLY", "FLEXIBLE", "NIGHT"] as const
export const VISIBILITY = ["PUBLIC", "MATCHES_ONLY", "PRIVATE"] as const

export const LIFESTYLE_LABEL = {
  smoking: { NO: "Non-smoker", OCCASIONALLY: "Smokes occasionally", YES: "Smoker" },
  pets: { NO: "No pets", YES: "Has or wants pets", ALLERGY: "Allergic to pets" },
  sleep: { EARLY: "Early riser", FLEXIBLE: "Flexible hours", NIGHT: "Night owl" },
} as const

export const VISIBILITY_LABEL: Record<Visibility, { title: string; body: string }> = {
  PUBLIC: { title: "Public", body: "Any tenant looking for roommates can see your profile." },
  MATCHES_ONLY: { title: "Matches only", body: "Only people you match with see your profile." },
  PRIVATE: { title: "Private", body: "Hidden. You can still look for matches yourself." },
}

const isoDate = z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date")
const taka = z.string().refine((v) => v === "" || /^\d{1,9}$/.test(v), "Whole taka only")

// Mirrors B7A6 preferencesPutSchema (budget ≥ 0 and min ≤ max; ≤20 cities of 1..80; ≤30 interests of 1..40).
export const preferencesSchema = z
  .object({
    budgetMin: taka,
    budgetMax: taka,
    cities: z
      .array(z.string().trim().min(1).max(80, "City names are at most 80 characters"))
      .min(1, "Add at least one city")
      .max(20, "Add at most 20 cities"),
    moveInFrom: isoDate,
    moveInTo: isoDate,
    smoking: z.enum([...SMOKING, ""]),
    pets: z.enum([...PETS, ""]),
    sleep: z.enum([...SLEEP, ""]),
    interests: z
      .array(z.string().trim().min(1).max(40, "Interests are at most 40 characters"))
      .max(30, "Add at most 30 interests"),
    visibility: z.enum(VISIBILITY),
  })
  .refine((v) => v.budgetMin === "" || v.budgetMax === "" || Number(v.budgetMin) <= Number(v.budgetMax), {
    path: ["budgetMax"],
    message: "Maximum must be at least the minimum",
  })
  .refine((v) => v.moveInFrom === "" || v.moveInTo === "" || v.moveInFrom <= v.moveInTo, {
    path: ["moveInTo"],
    message: "Latest date must be on or after the earliest",
  })

export type PreferencesDraft = z.infer<typeof preferencesSchema>

export const STEP_FIELDS: Array<Array<keyof PreferencesDraft>> = [
  ["budgetMin", "budgetMax", "cities"],
  ["moveInFrom", "moveInTo", "smoking", "pets", "sleep"],
  ["interests", "visibility"],
]

export const EMPTY_DRAFT: PreferencesDraft = {
  budgetMin: "",
  budgetMax: "",
  cities: [],
  moveInFrom: "",
  moveInTo: "",
  smoking: "",
  pets: "",
  sleep: "",
  interests: [],
  visibility: "PRIVATE",
}

function pick<T extends readonly string[]>(allowed: T, v: unknown): T[number] | "" {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T[number]) : ""
}

export function draftFromPreferences(p: PreferencesView): PreferencesDraft {
  const life = p.lifestyle ?? {}
  return {
    budgetMin: p.budgetMinMinor ? String(Math.round(Number(p.budgetMinMinor) / 100)) : "",
    budgetMax: p.budgetMaxMinor ? String(Math.round(Number(p.budgetMaxMinor) / 100)) : "",
    cities: p.preferredCities,
    moveInFrom: p.moveInFrom ?? "",
    moveInTo: p.moveInTo ?? "",
    smoking: pick(SMOKING, life.smoking),
    pets: pick(PETS, life.pets),
    sleep: pick(SLEEP, life.sleep),
    interests: p.interests,
    visibility: p.visibility,
  }
}

/** Draft → PUT /preferences/tenant body (minor units, nulls for cleared dates). */
export function toPreferencesPut(d: PreferencesDraft) {
  const lifestyle: Record<string, string> = {}
  if (d.smoking) lifestyle.smoking = d.smoking
  if (d.pets) lifestyle.pets = d.pets
  if (d.sleep) lifestyle.sleep = d.sleep
  return {
    ...(d.budgetMin !== "" ? { budgetMinMinor: Number(d.budgetMin) * 100 } : {}),
    ...(d.budgetMax !== "" ? { budgetMaxMinor: Number(d.budgetMax) * 100 } : {}),
    preferredCities: d.cities,
    moveInFrom: d.moveInFrom || null,
    moveInTo: d.moveInTo || null,
    lifestyle,
    interests: d.interests,
    visibility: d.visibility,
  }
}
