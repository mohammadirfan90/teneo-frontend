import type { MinorStr } from "@/types/api"

/** Minor units (string or number) → "৳12,500" / "$750.00". Whole amounts drop decimals. */
export function formatMoney(minor: MinorStr | number | null | undefined, currency = "BDT"): string {
  if (minor === null || minor === undefined || minor === "") return "—"
  const value = Number(minor) / 100
  if (!Number.isFinite(value)) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Accepts "YYYY-MM-DD" or full ISO. Date-only values are formatted in UTC so they never shift a day. */
export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!value) return "—"
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return "—"
  const dateOnly = value.length === 10 || value.endsWith("T00:00:00.000Z")
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
    ...opts,
  }).format(d)
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, { hour: "2-digit", minute: "2-digit" })
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]

/** "3 days ago" / "in 2 hours". `now` is injectable so server renders stay deterministic. */
export function formatRelative(value: string | null | undefined, now: number): string {
  if (!value) return "—"
  const diff = (new Date(value).getTime() - now) / 1000
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return "just now"
}

/** "VIEWING_SCHEDULED" → "Viewing scheduled". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—"
  const s = value.toLowerCase().replace(/_/g, " ")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function initials(name: string): string {
  const parts = name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
}
