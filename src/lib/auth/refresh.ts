import "server-only"

import type { AuthResponse } from "@/types/api"
import { backendRaw } from "@/lib/api/backend"

/**
 * Single-flight refresh. The backend rotates refresh tokens and revokes the whole
 * session family if an already-used token is presented again, so parallel requests
 * (e.g. prefetches) holding the same refresh token must share one call. Results are
 * kept briefly so late arrivals with the old cookie get the same new tokens.
 *
 * Scope: per server instance. Cross-instance races on serverless are possible but rare.
 */
const inflight = new Map<string, Promise<AuthResponse | null>>()
const recent = new Map<string, { at: number; auth: AuthResponse }>()
const RECENT_TTL_MS = 30_000

export function refreshSession(refreshToken: string): Promise<AuthResponse | null> {
  const cached = recent.get(refreshToken)
  if (cached && Date.now() - cached.at < RECENT_TTL_MS) return Promise.resolve(cached.auth)

  const pending = inflight.get(refreshToken)
  if (pending) return pending

  const p = (async () => {
    try {
      const { status, body } = await backendRaw<AuthResponse>("/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      })
      if (status === 200 && body?.success) {
        recent.set(refreshToken, { at: Date.now(), auth: body.data })
        return body.data
      }
      return null
    } catch {
      return null
    } finally {
      inflight.delete(refreshToken)
      for (const [k, v] of recent) if (Date.now() - v.at > RECENT_TTL_MS) recent.delete(k)
    }
  })()

  inflight.set(refreshToken, p)
  return p
}
