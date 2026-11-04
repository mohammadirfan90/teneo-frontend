import Link from "next/link"
import { cn } from "cn"

import { toQueryString, type RawSearchParams } from "@/lib/search-params"

export interface FilterTab {
  /** URL value; `null` is the "all" tab (param removed). */
  value: string | null
  label: string
}

/**
 * Server-rendered status tabs bound to one URL param. Changing tab drops the
 * cursor/trail so pagination restarts. Scrolls horizontally on narrow screens.
 */
export function FilterTabs({
  basePath,
  searchParams,
  param = "status",
  tabs,
  label = "Filter by status",
}: {
  basePath: string
  searchParams: RawSearchParams
  param?: string
  tabs: FilterTab[]
  label?: string
}) {
  const raw = searchParams[param]
  const current = (Array.isArray(raw) ? raw[0] : raw) || null

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-lg bg-surface-2 p-1">
        {tabs.map((t) => {
          const active = t.value === current
          const href = basePath + toQueryString(searchParams, { [param]: t.value, cursor: null, trail: null })
          return (
            <li key={t.value ?? "all"}>
              <Link
                href={href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
                  active && "bg-card text-foreground shadow-sm"
                )}
              >
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
