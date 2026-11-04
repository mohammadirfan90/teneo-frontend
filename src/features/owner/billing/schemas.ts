import { z } from "zod"

import type { UtilityType } from "@/types/domain"

export const UTILITY_TYPES: UtilityType[] = ["ELECTRICITY", "WATER", "GAS", "INTERNET"]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Lease shape the invoice form needs (plain, serialisable). */
export interface BillableLease {
  id: string
  label: string
  /** "YYYY-MM-DD" */
  start: string
  /** "YYYY-MM-DD" */
  end: string
  currency: string
  rentMinor: string
}

/** Mirrors POST /bills/generate (strict): leaseId, periodStart ≤ periodEnd, inside the lease window. */
export function generateInvoiceSchema(leases: BillableLease[]) {
  return z
    .object({
      leaseId: z.string().min(1, "Choose a lease"),
      periodStart: z.string().regex(ISO_DATE, "Pick a start date"),
      periodEnd: z.string().regex(ISO_DATE, "Pick an end date"),
    })
    .superRefine((v, ctx) => {
      const lease = leases.find((l) => l.id === v.leaseId)
      if (!lease || !ISO_DATE.test(v.periodStart) || !ISO_DATE.test(v.periodEnd)) return
      if (v.periodStart < lease.start)
        ctx.addIssue({ code: "custom", path: ["periodStart"], message: "Starts before the lease does" })
      if (v.periodEnd > lease.end)
        ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "Ends after the lease does" })
      if (v.periodEnd < v.periodStart)
        ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "End must be on or after the start" })
    })
}
export type GenerateInvoiceValues = z.infer<ReturnType<typeof generateInvoiceSchema>>

const decimal = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .refine((s) => /^\d+(\.\d{1,2})?$/.test(s), "Use a number with up to 2 decimals")

/** Mirrors CreateMeter (strict): rate entered in taka, sent as minor units. */
export const meterSchema = z.object({
  utilityType: z.enum(["ELECTRICITY", "WATER", "GAS", "INTERNET"], "Choose a utility"),
  label: z.string().trim().min(1, "Give the meter a name").max(120, "Use at most 120 characters"),
  rate: decimal("the rate per unit").refine((s) => Number(s) <= 1_000_000, "That rate looks too high"),
  unitLabel: z.string().trim().min(1, "Enter the unit, e.g. kWh").max(40, "Use at most 40 characters"),
})
export type MeterValues = z.infer<typeof meterSchema>

/** Mirrors CreateReading (strict). */
export const readingSchema = z.object({
  readingDate: z.string().regex(ISO_DATE, "Pick the reading date"),
  readingValue: z
    .string()
    .trim()
    .min(1, "Enter the meter value")
    .refine((s) => /^\d+(\.\d{1,3})?$/.test(s), "Use a positive number (up to 3 decimals)"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters"),
})
export type ReadingValues = z.infer<typeof readingSchema>

/** "2500.5" taka → 250050 minor units. */
export function takaToMinor(value: string): number {
  return Math.round(Number(value) * 100)
}

/** Local calendar date as YYYY-MM-DD (client only). */
export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** The current calendar month, clipped to the lease window. */
export function defaultPeriod(
  lease: BillableLease,
  today: string
): { periodStart: string; periodEnd: string } {
  const [y, m] = today.split("-").map(Number)
  const first = `${y}-${String(m).padStart(2, "0")}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const last = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  let periodStart = first < lease.start ? lease.start : first
  let periodEnd = last > lease.end ? lease.end : last
  // Lease window doesn't touch this month: fall back to the lease's first month.
  if (periodStart > periodEnd) {
    periodStart = lease.start
    const [ly, lm] = lease.start.split("-").map(Number)
    const lLast = new Date(Date.UTC(ly, lm, 0)).getUTCDate()
    const candidate = `${ly}-${String(lm).padStart(2, "0")}-${String(lLast).padStart(2, "0")}`
    periodEnd = candidate > lease.end ? lease.end : candidate
  }
  return { periodStart, periodEnd }
}
