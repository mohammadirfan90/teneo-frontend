import "server-only"

import type { AuthResponse, AuthUser, Role } from "@/types/api"
import { ROLES } from "@/types/api"

export const ACCESS_COOKIE = "teneo_at"
export const REFRESH_COOKIE = "teneo_rt"
/** Non-secret routing hint for proxy.ts: "<role>|<userId>|<email>". Authorization is always the backend. */
export const USER_COOKIE = "teneo_user"

const secure = process.env.NODE_ENV === "production"
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30
/** Expire our copy a minute early so we refresh before the backend rejects it. */
const ACCESS_SKEW = 60

interface CookieOpts {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "lax" | "strict" | "none"
  path?: string
  maxAge?: number
}

const base: CookieOpts = { httpOnly: true, secure, sameSite: "lax", path: "/" }

/** Minimal surface shared by `cookies()` and `NextResponse#cookies`. */
export interface CookieWriter {
  set(name: string, value: string, options?: CookieOpts): unknown
  delete(name: string): unknown
}

export function primaryRole(roles: Role[]): Role | null {
  // ADMIN wins, then OWNER, then TENANT — accounts have one role in practice.
  for (const r of ["ADMIN", "OWNER", "TENANT"] as const) if (roles.includes(r)) return r
  return null
}

export function encodeUserHint(user: AuthUser): string {
  return [primaryRole(user.roles) ?? "NONE", user.id, user.email].join("|")
}

export interface UserHint {
  role: Role | null
  id: string
  email: string
}

export function decodeUserHint(raw: string | undefined): UserHint | null {
  if (!raw) return null
  const [role, id, email] = raw.split("|")
  if (!id || !email) return null
  return { role: (ROLES as readonly string[]).includes(role) ? (role as Role) : null, id, email }
}

export function sessionCookieValues(auth: AuthResponse) {
  return [
    {
      name: ACCESS_COOKIE,
      value: auth.accessToken,
      options: { ...base, maxAge: Math.max(60, auth.expiresIn - ACCESS_SKEW) },
    },
    { name: REFRESH_COOKIE, value: auth.refreshToken, options: { ...base, maxAge: REFRESH_MAX_AGE } },
    { name: USER_COOKIE, value: encodeUserHint(auth.user), options: { ...base, maxAge: REFRESH_MAX_AGE } },
  ] as const
}

export function writeSession(jar: CookieWriter, auth: AuthResponse): void {
  for (const c of sessionCookieValues(auth)) jar.set(c.name, c.value, c.options)
}

export function clearSession(jar: CookieWriter): void {
  jar.delete(ACCESS_COOKIE)
  jar.delete(REFRESH_COOKIE)
  jar.delete(USER_COOKIE)
}
