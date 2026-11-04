"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"

/** Params that belong to pagination; any filter change resets them. */
export const PAGINATION_KEYS = ["cursor", "trail"] as const

type Patch = Record<string, string | number | null | undefined>

/**
 * URL-backed state for filters, sort, search and pagination. Every view is
 * bookmarkable. Callers must sit under a <Suspense> boundary (useSearchParams).
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams])

  const set = useCallback(
    (patch: Patch, opts: { keepPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key)
        else next.set(key, String(value))
      }
      if (!opts.keepPage) for (const k of PAGINATION_KEYS) next.delete(k)
      const qs = next.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  const clear = useCallback((keys: string[]) => set(Object.fromEntries(keys.map((k) => [k, null]))), [set])

  return { get, set, clear, searchParams, isPending }
}
