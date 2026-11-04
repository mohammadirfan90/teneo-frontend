import { NextResponse, type NextRequest } from "next/server"

import { buildUrl } from "@/lib/api/backend"
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSession, writeSession } from "@/lib/auth/cookies"
import { refreshSession } from "@/lib/auth/refresh"
import type { AuthResponse } from "@/types/api"

/**
 * Authenticated passthrough for Client Components: browser → (cookies) → here → (Bearer) → B7A6.
 * Tokens never reach the browser. Auth endpoints are not proxied (their bodies contain tokens).
 */

const FORWARD_REQUEST_HEADERS = ["content-type", "idempotency-key", "x-correlation-id", "accept"]
const FORWARD_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "idempotent-replayed",
  "x-correlation-id",
  "retry-after",
]
const MAX_BODY_BYTES = 16 * 1024 * 1024

type Ctx = RouteContext<"/api/proxy/[...path]">

async function handle(request: NextRequest, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params
  if (path.some((seg) => seg === ".." || seg === "." || seg.includes("\\"))) {
    return failure(400, "Invalid path")
  }
  if (path[0] === "auth") return failure(404, "Not found")

  const target = new URL(buildUrl(`/${path.map(encodeURIComponent).join("/")}`))
  target.search = request.nextUrl.search

  const method = request.method
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer()
  if (body && body.byteLength > MAX_BODY_BYTES) return failure(413, "Upload is too large")

  const headers = new Headers()
  for (const name of FORWARD_REQUEST_HEADERS) {
    const v = request.headers.get(name)
    if (v) headers.set(name, v)
  }
  if (body && !headers.has("content-type")) headers.set("content-type", "application/json")
  if (body && !headers.has("idempotency-key")) headers.set("idempotency-key", crypto.randomUUID())

  const send = (token: string | undefined) => {
    const h = new Headers(headers)
    if (token) h.set("authorization", `Bearer ${token}`)
    // Express 5 rejects JSON mutations with no body at all.
    const payload = body && body.byteLength === 0 && h.get("content-type")?.includes("json") ? "{}" : body
    return fetch(target, { method, headers: h, body: payload, cache: "no-store" })
  }

  let refreshed: AuthResponse | null = null
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value

  if (!accessToken && refreshToken) {
    refreshed = await refreshSession(refreshToken)
    accessToken = refreshed?.accessToken
  }

  let upstream = await send(accessToken)
  if (upstream.status === 401 && refreshToken && !refreshed) {
    refreshed = await refreshSession(refreshToken)
    if (refreshed) upstream = await send(refreshed.accessToken)
  }

  const out = new NextResponse(upstream.body, { status: upstream.status })
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const v = upstream.headers.get(name)
    if (v) out.headers.set(name, v)
  }
  out.headers.set("cache-control", "no-store")

  if (refreshed) writeSession(out.cookies, refreshed)
  else if (upstream.status === 401 && refreshToken) clearSession(out.cookies)
  return out
}

function failure(status: number, message: string) {
  return NextResponse.json(
    { success: false, message, errors: [{ field: "unknown", code: "PROXY", message }] },
    { status }
  )
}

export const GET = handle
export const POST = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
