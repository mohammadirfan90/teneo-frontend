"use client"

import type { ApiEnvelope } from "@/types/api"
import { ApiError, isFailureBody } from "./errors"

type Primitive = string | number | boolean | null | undefined
export type ClientQuery = Record<string, Primitive | Primitive[]>

interface ClientRequest {
  query?: ClientQuery
  body?: unknown
  /** FormData uploads; Content-Type is set by the browser. */
  formData?: FormData
  idempotencyKey?: string
  signal?: AbortSignal
}

function toUrl(path: string, query?: ClientQuery): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v === undefined || v === null || v === "") continue
      qs.append(key, String(v))
    }
  }
  const clean = path.replace(/^\/+/, "")
  const s = qs.toString()
  return `/api/proxy/${clean}${s ? `?${s}` : ""}`
}

async function request<T>(method: string, path: string, req: ClientRequest = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  let body: BodyInit | undefined
  if (method !== "GET") {
    headers["Idempotency-Key"] = req.idempotencyKey ?? crypto.randomUUID()
    if (req.formData) {
      body = req.formData
    } else {
      headers["Content-Type"] = "application/json"
      body = JSON.stringify(req.body ?? {})
    }
  }

  let res: Response
  try {
    res = await fetch(toUrl(path, req.query), { method, headers, body, signal: req.signal, credentials: "same-origin" })
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e
    throw new ApiError(0, "You appear to be offline. Check your connection and try again.")
  }

  let parsed: ApiEnvelope<T> | null = null
  try {
    parsed = (await res.json()) as ApiEnvelope<T>
  } catch {
    parsed = null
  }

  if (parsed && parsed.success) return parsed.data
  if (isFailureBody(parsed)) throw ApiError.fromFailure(res.status, parsed)
  throw new ApiError(res.status, "Unexpected response from the server.")
}

/** Browser-side API. Calls go through /api/proxy so tokens stay in HTTP-only cookies. */
export const apiClient = {
  get: <T>(path: string, query?: ClientQuery, signal?: AbortSignal) => request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown, opts?: Omit<ClientRequest, "body">) => request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<ClientRequest, "body">) => request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<ClientRequest, "body">) => request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: Omit<ClientRequest, "body">) => request<T>("DELETE", path, opts),
  upload: <T>(path: string, formData: FormData, opts?: Omit<ClientRequest, "formData">) =>
    request<T>("POST", path, { ...opts, formData }),
}
