import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { str, toQueryString, type RawSearchParams } from "@/lib/search-params"

/**
 * Prev/Next for cursor-only APIs, fully in the URL:
 *   cursor = cursor of the current page (absent on page 1)
 *   trail  = comma list of earlier cursors ("~" marks page 1)
 * so every page is shareable and "Previous" works without client state.
 */
export function CursorPagination({
  basePath,
  searchParams,
  nextCursor,
  itemCount,
}: {
  basePath: string
  searchParams: RawSearchParams
  nextCursor: string | null
  itemCount: number
}) {
  const cursor = str(searchParams, "cursor")
  const trail = (str(searchParams, "trail") ?? "").split(",").filter(Boolean)
  const page = trail.length + 1

  if (page === 1 && !nextCursor) return null

  const nextHref =
    nextCursor &&
    basePath + toQueryString(searchParams, { cursor: nextCursor, trail: [...trail, cursor ?? "~"].join(",") })

  const prevCursor = trail.at(-1)
  const prevHref =
    page > 1 &&
    basePath +
      toQueryString(searchParams, {
        cursor: prevCursor === "~" ? null : prevCursor,
        trail: trail.slice(0, -1).join(",") || null,
      })

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} · {itemCount} shown
      </p>
      <div className="flex gap-2">
        {prevHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={prevHref} scroll={false} rel="prev">
              <ChevronLeft /> Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft /> Previous
          </Button>
        )}
        {nextHref ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={nextHref} scroll={false} rel="next">
              Next <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight />
          </Button>
        )}
      </div>
    </nav>
  )
}
