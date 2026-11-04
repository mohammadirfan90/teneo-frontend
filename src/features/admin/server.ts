import "server-only"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { buildUrl, type Query } from "@/lib/api/backend"
import { ApiError } from "@/lib/api/errors"
import { api, PATH_HEADER } from "@/lib/api/server"
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies"
import type { Page } from "@/types/api"
import type { AuditLogView, RoomSearchView, UserSearchHit } from "@/types/domain"

/** RFC 4180 parser for the audit export (userAgent may contain quoted commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(field)
      field = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/**
 * Every audit row matching the filters, via `format=csv` (the JSON list caps at 100 and its
 * cursor ignores from/to). Used for date-bounded aggregates only.
 */
export async function auditRows(query: Query): Promise<AuditLogView[]> {
  const jar = await cookies()
  const token = jar.get(ACCESS_COOKIE)?.value
  const res = await fetch(buildUrl("/admin/audit-logs", { ...query, format: "csv" }), {
    headers: { Accept: "text/csv", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    cache: "no-store",
  })
  if (res.status === 401) {
    const here = (await headers()).get(PATH_HEADER) ?? "/admin"
    if (jar.get(REFRESH_COOKIE)) redirect(`/api/auth/refresh?next=${encodeURIComponent(here)}`)
    redirect(`/login?next=${encodeURIComponent(here)}`)
  }
  if (!res.ok) throw new ApiError(res.status, "The audit log is unavailable.")

  const [head, ...lines] = parseCsv(await res.text())
  if (!head) return []
  const idx = (name: string) => head.indexOf(name)
  const col = {
    id: idx("id"),
    occurredAt: idx("occurredAt"),
    actorUserId: idx("actorUserId"),
    actorRole: idx("actorRole"),
    action: idx("action"),
    targetEntityType: idx("targetEntityType"),
    targetEntityId: idx("targetEntityId"),
    ipAddress: idx("ipAddress"),
    userAgent: idx("userAgent"),
  }
  const val = (r: string[], i: number) => (i >= 0 && r[i] ? r[i] : null)
  return lines
    .filter((r) => r.length > 1 && r[col.id])
    .map((r) => ({
      id: r[col.id] ?? "",
      occurredAt: r[col.occurredAt] ?? "",
      actorUserId: val(r, col.actorUserId),
      actorRole: val(r, col.actorRole),
      action: r[col.action] ?? "",
      targetEntityType: val(r, col.targetEntityType),
      targetEntityId: val(r, col.targetEntityId),
      ipAddress: val(r, col.ipAddress),
      userAgent: val(r, col.userAgent),
    }))
}

/** Follows cursors until exhausted or `maxPages`; `complete` is false when we stopped early. */
async function collect<T>(
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  maxPages: number
): Promise<{ items: T[]; complete: boolean }> {
  const items: T[] = []
  let cursor: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const page = await fetchPage(cursor)
    items.push(...page.items)
    if (!page.nextCursor) return { items, complete: true }
    cursor = page.nextCursor
  }
  return { items, complete: false }
}

/** All active accounts (search excludes deactivated users). PII stays redacted. */
export function allUsers(maxPages = 10) {
  return collect<UserSearchHit>(
    (cursor) => api<Page<UserSearchHit>>("/admin/users/search", { query: { q: "@", limit: 50, cursor } }),
    maxPages
  )
}

/** Every publicly listed room (PUBLISHED rooms on PUBLISHED properties). */
export function allLiveRooms(maxPages = 10) {
  return collect<RoomSearchView>(
    (cursor) => api<Page<RoomSearchView>>("/search/rooms", { query: { limit: 100, sort: "newest", cursor } }),
    maxPages
  )
}

/**
 * Fetch many resources by id, dropping the ones that 404/403/410 instead of failing the page.
 * Batched: the backend rate-limits authenticated calls to ~40/s per IP.
 */
export async function fetchEach<T>(ids: string[], path: (id: string) => string, batch = 8): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += batch) {
    const results = await Promise.allSettled(ids.slice(i, i + batch).map((id) => api<T>(path(id))))
    for (const r of results) {
      if (r.status === "fulfilled") out.push(r.value)
      else if (!(r.reason instanceof ApiError) || ![403, 404, 410].includes(r.reason.status)) throw r.reason
    }
  }
  return out
}
