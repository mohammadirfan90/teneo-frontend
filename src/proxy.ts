import { NextResponse, type NextRequest } from "next/server"

import { PATH_HEADER } from "@/lib/api/path-header"
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  USER_COOKIE,
  clearSession,
  decodeUserHint,
  sessionCookieValues,
} from "@/lib/auth/cookies"
import { refreshSession } from "@/lib/auth/refresh"
import { SIGNED_IN_PREFIXES, homeFor, requiredRoleFor } from "@/lib/auth/roles"

/**
 * Optimistic route guard (cookies only — the backend remains the authority):
 *  1. If the access cookie expired but a refresh cookie exists, rotate tokens now so the
 *     page render (which can't write cookies) gets a valid token. New cookies are written
 *     to both the forwarded request and the response.
 *  2. Signed-out users on protected routes → /login?next=…
 *  3. Signed-in users on another role's area → their own home; on /login|/register → home.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  let refreshed: Awaited<ReturnType<typeof refreshSession>> = null
  let refreshFailed = false

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  if (!request.cookies.get(ACCESS_COOKIE) && refreshToken) {
    refreshed = await refreshSession(refreshToken)
    if (refreshed) {
      for (const c of sessionCookieValues(refreshed)) request.cookies.set(c.name, c.value)
    } else {
      refreshFailed = true
      request.cookies.delete(REFRESH_COOKIE)
      request.cookies.delete(USER_COOKIE)
    }
  }

  const signedIn = Boolean(request.cookies.get(ACCESS_COOKIE) || request.cookies.get(REFRESH_COOKIE))
  const hint = signedIn ? decodeUserHint(request.cookies.get(USER_COOKIE)?.value) : null
  const role = hint?.role ?? null

  const finish = (res: NextResponse) => {
    if (refreshed) for (const c of sessionCookieValues(refreshed)) res.cookies.set(c.name, c.value, c.options)
    if (refreshFailed) clearSession(res.cookies)
    return res
  }

  const needsRole = requiredRoleFor(pathname)
  const needsSession =
    needsRole || SIGNED_IN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  if (needsSession && !signedIn) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname + search)
    return finish(NextResponse.redirect(login))
  }

  if (signedIn && (needsRole ? needsRole !== role : pathname === "/login" || pathname === "/register")) {
    return finish(NextResponse.redirect(new URL(homeFor(role), request.url)))
  }

  const headers = new Headers(request.headers)
  headers.set(PATH_HEADER, pathname + search)
  return finish(NextResponse.next({ request: { headers } }))
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|svg)$).*)",
  ],
}
