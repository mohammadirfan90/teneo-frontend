import "server-only"

import type { ApiEnvelope } from "@/types/api"
import { ApiError, isFailureBody } from "./errors"

export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "")

export type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue | QueryValue[]>

export interface BackendRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** JSON-serialisable body. Mutations always send at least `{}` (Express 5 rejects a missing body). */
  body?: unknown
  /** Pre-built body (multipart passthrough). Content-Type must be set in `headers`. */
  rawBody?: BodyInit
  query?: Query
  accessToken?: string
  headers?: Record<string, string>
  /** Idempotency key for mutations. Generated when omitted. */
  idempotencyKey?: string
  signal?: AbortSignal
}

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_BASE_URL + (path.startsWith("/") ? path : `/${path}`))
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      const values = Array.isArray(value) ? value : [value]
      for (const v of values) {
        if (v === undefined || v === null || v === "") continue
        url.searchParams.append(key, String(v))
      }
    }
  }
  return url.toString()
}

/** Raw call: returns the parsed envelope and status without throwing on 4xx/5xx. */
export async function backendRaw<T>(
  path: string,
  req: BackendRequest = {}
): Promise<{ status: number; body: ApiEnvelope<T> | null; headers: Headers }> {
  const method = req.method ?? "GET"
  const headers: Record<string, string> = { Accept: "application/json", ...req.headers }
  if (req.accessToken) headers.Authorization = `Bearer ${req.accessToken}`

  let body: BodyInit | undefined
  if (method !== "GET") {
    headers["Idempotency-Key"] ??= req.idempotencyKey ?? crypto.randomUUID()
    if (req.rawBody !== undefined) {
      body = req.rawBody
    } else {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(req.body ?? {})
    }
  }

  const res = await fetch(buildUrl(path, req.query), {
    method,
    headers,
    body,
    cache: "no-store",
    signal: req.signal,
  })

  const text = await res.text()
  let parsed: ApiEnvelope<T> | null = null
  if (text) {
    try {
      parsed = JSON.parse(text) as ApiEnvelope<T>
    } catch {
      parsed = null
    }
  }
  return { status: res.status, body: parsed, headers: res.headers }
}

/** Unwraps `data` or throws ApiError. */
export async function backend<T>(path: string, req: BackendRequest = {}): Promise<T> {
  const { status, body } = await backendRaw<T>(path, req)
  if (body && body.success) return body.data
  if (isFailureBody(body)) throw ApiError.fromFailure(status, body)
  throw new ApiError(
    status,
    status >= 500 ? "The service is unavailable." : "Unexpected response from the server."
  )
}
