import "server-only"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import type { MeView } from "@/types/api"
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, decodeUserHint, type UserHint } from "@/lib/auth/cookies"
import { backend, type BackendRequest } from "./backend"
import { PATH_HEADER } from "./path-header"
import { isApiError } from "./errors"

export { PATH_HEADER }

/**
 * Authenticated backend call for Server Components and Server Actions.
 *
 * Server Components can't write cookies, and refresh tokens rotate, so this never
 * refreshes in place. proxy.ts refreshes ahead of time; if a 401 still slips
 * through, we bounce through the refresh route handler and come back.
 */
export async function api<T>(path: string, req: Omit<BackendRequest, "accessToken"> = {}): Promise<T> {
  const jar = await cookies()
  const accessToken = jar.get(ACCESS_COOKIE)?.value
  try {
    return await backend<T>(path, { ...req, accessToken })
  } catch (e) {
    if (isApiError(e) && e.status === 401) {
      const here = (await headers()).get(PATH_HEADER) ?? "/"
      if (jar.get(REFRESH_COOKIE)) redirect(`/api/auth/refresh?next=${encodeURIComponent(here)}`)
      redirect(`/login?next=${encodeURIComponent(here)}`)
    }
    throw e
  }
}

/** Cheap session read from the routing hint cookie. Not an authorization check. */
export const getSessionHint = cache(async (): Promise<UserHint | null> => {
  const jar = await cookies()
  if (!jar.get(REFRESH_COOKIE) && !jar.get(ACCESS_COOKIE)) return null
  return decodeUserHint(jar.get(USER_COOKIE)?.value)
})

/** Current user from the backend, deduped per request. */
export const getMe = cache(async (): Promise<MeView> => api<MeView>("/users/me"))
