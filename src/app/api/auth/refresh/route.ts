import { NextResponse, type NextRequest } from "next/server"

import { REFRESH_COOKIE, clearSession, writeSession } from "@/lib/auth/cookies"
import { refreshSession } from "@/lib/auth/refresh"
import { safeNext } from "@/lib/auth/roles"

/** Fallback used by server-rendered pages that hit a 401: rotate tokens, then go back. */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"), "/")
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value
  const auth = refreshToken ? await refreshSession(refreshToken) : null

  if (!auth) {
    const res = NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, request.url))
    clearSession(res.cookies)
    return res
  }

  const res = NextResponse.redirect(new URL(next, request.url))
  writeSession(res.cookies, auth)
  return res
}
