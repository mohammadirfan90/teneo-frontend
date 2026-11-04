/** Helpers for the plain-object `searchParams` that pages receive. */

export type RawSearchParams = Record<string, string | string[] | undefined>

export function str(sp: RawSearchParams, key: string): string | undefined {
  const v = sp[key]
  const s = Array.isArray(v) ? v[0] : v
  return s && s.trim() !== "" ? s.trim() : undefined
}

export function int(sp: RawSearchParams, key: string, min?: number, max?: number): number | undefined {
  const s = str(sp, key)
  if (s === undefined) return undefined
  const n = Number.parseInt(s, 10)
  if (!Number.isFinite(n)) return undefined
  if (min !== undefined && n < min) return min
  if (max !== undefined && n > max) return max
  return n
}

export function oneOf<T extends string>(
  sp: RawSearchParams,
  key: string,
  allowed: readonly T[]
): T | undefined {
  const s = str(sp, key)
  return s && (allowed as readonly string[]).includes(s) ? (s as T) : undefined
}

export function toQueryString(
  sp: RawSearchParams,
  patch: Record<string, string | null | undefined> = {}
): string {
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v
    if (s) out.set(k, s)
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === "") out.delete(k)
    else out.set(k, v)
  }
  const qs = out.toString()
  return qs ? `?${qs}` : ""
}
